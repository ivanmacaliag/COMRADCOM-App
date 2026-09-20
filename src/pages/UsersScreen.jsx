import React, { useEffect, useMemo, useState } from 'react';
import { Search, Phone, UsersRound, RefreshCw, AlertCircle, MapPin, Mail } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const valueFor = (data, ...keys) => {
  for (const key of keys) if (data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const key of keys) {
    const match = Object.keys(data).find((actualKey) => normalize(actualKey) === normalize(key));
    if (match && data[match] !== undefined && data[match] !== null && data[match] !== '') return data[match];
  }
  return '';
};

const memberFromDocument = (document) => {
  const data = document.data();
  const firstName = valueFor(data, 'First Name', 'firstName', 'fname', 'name');
  const lastName = valueFor(data, 'Last Name', 'lastName', 'lname');
  const fullName = valueFor(data, 'fullName', 'displayName') || [firstName, lastName].filter(Boolean).join(' ');
  return {
    id: document.id,
    name: String(fullName || valueFor(data, 'username') || 'Unnamed member'),
    callsign: String(valueFor(data, 'Fancy Callsign :', 'callsign', 'fancyCallsign', 'netID', 'COMRADCOM Callsign', 'crcCallsign', 'username') || '—'),
    position: String(valueFor(data, 'position', 'role', 'Membership Type', 'membershipType', 'memberType') || 'Registered member'),
    address: String(valueFor(data, 'Present Address:', 'Address', 'address', 'location', 'Home Address', 'city') || ''),
    contact: String(valueFor(data, 'Contact Number 1', 'Contact', 'contact', 'phone', 'mobile', 'phoneNumber') || ''),
    email: String(valueFor(data, 'email', 'emailAddress', 'Email Address') || ''),
  };
};

export function UsersScreen() {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let registryRecords = [];
    let legacyRecords = [];
    const sync = () => {
      const merged = new Map();
      legacyRecords.forEach((member) => merged.set(member.callsign.toLowerCase().trim() || member.id, member));
      registryRecords.forEach((member) => {
        const key = member.callsign.toLowerCase().trim() || member.id;
        merged.set(key, { ...(merged.get(key) || {}), ...member });
      });
      setMembers([...merged.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    };
    const onError = (snapshotError) => {
      console.error('Unable to load COMRADCOM registry:', snapshotError);
      setError('The member registry is unavailable. Please check your connection or Firebase permissions.');
      setLoading(false);
    };
    const stopRegistry = onSnapshot(collection(db, 'members'), (snapshot) => { registryRecords = snapshot.docs.map(memberFromDocument); setError(''); sync(); }, onError);
    const stopLegacy = onSnapshot(collection(db, 'netcall_members'), (snapshot) => { legacyRecords = snapshot.docs.map(memberFromDocument); setError(''); sync(); }, onError);
    return () => { stopRegistry(); stopLegacy(); };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return !query ? members : members.filter((member) => [member.name, member.callsign, member.position, member.address, member.contact, member.email].some((value) => String(value).toLowerCase().includes(query)));
  }, [members, searchQuery]);

  return <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-5 py-5 lg:px-8 lg:py-8">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div className="animate-slide-up"><span className="text-[9px] font-bold tracking-[0.2em] text-secondary">REGISTERED MEMBERS</span><h2 className="text-2xl font-black leading-tight text-on-surface lg:text-3xl">COMRADCOM Member Directory</h2><p className="mt-1 text-xs text-gray-400">Every registered member from the Firebase database</p></div><div className="flex gap-3"><Stat label="Registered" value={members.length} color="text-primary" /></div></div>
    <div className="relative animate-slide-up lg:max-w-xl" style={{ animationDelay: '0.1s' }}><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="search" placeholder="Search name, callsign, role, location, or contact…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15" /></div>
    {loading ? <Loading /> : error ? <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700"><div className="flex items-center gap-2 font-bold"><AlertCircle size={18} /> Directory unavailable</div><p className="mt-1 text-sm">{error}</p></div> : <div className="grid gap-3 pb-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((member, index) => <MemberCard key={member.id} member={member} index={index} />)}</div>}
    {!loading && !error && filtered.length === 0 && <div className="flex flex-1 flex-col items-center justify-center py-16 text-gray-400"><UsersRound size={36} className="mb-3 text-gray-300" /><span className="text-sm font-bold">No members match that search</span></div>}
  </div>;
}

function Stat({ label, value, color }) { return <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-100"><p className={`text-xl font-black ${color}`}>{value}</p><p className="text-[9px] font-bold tracking-wider text-slate-400">{label.toUpperCase()}</p></div>; }
function Loading() { return <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-400"><RefreshCw size={32} className="mb-3 animate-spin text-primary" /><span className="text-sm font-bold">Loading member directory…</span></div>; }
function MemberCard({ member, index }) {
  const initials = member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <article className="animate-slide-up rounded-2xl border border-white bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${Math.min(0.1 + index * 0.03, 0.5)}s` }}><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light"><span className="text-sm font-black text-white">{initials}</span></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-on-surface">{member.name}</h3><p className="mt-0.5 text-xs font-bold text-primary">{member.callsign}</p><p className="mt-1 text-xs text-slate-500">{member.position}</p></div></div>{(member.address || member.contact || member.email) && <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{member.address && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary" />{member.address}</span>}{member.email && <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 truncate hover:text-primary"><Mail size={12} className="shrink-0 text-primary" />{member.email}</a>}{member.contact && <a href={`tel:${member.contact}`} aria-label={`Call ${member.name}`} className="flex items-center gap-1.5 font-bold text-secondary"><Phone size={12} />{member.contact}</a>}</div>}</article>;
}
