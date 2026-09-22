import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, Phone, UsersRound, RefreshCw, AlertCircle, MapPin, Mail, 
  ShieldCheck, Radio, User, Award, HeartHandshake, PhoneCall, X, FileText
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Fuzzy & Exact Field Extractor (Matching COMRADCOM System admin-deploy)
const getVal = (data, ...keys) => {
  if (!data) return '';
  // 1. Exact match check
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
  }
  // 2. Fuzzy match (lowercase, no spaces, no punctuation)
  const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const k of keys) {
    const target = normalize(k);
    if (!target) continue;
    const matchKey = Object.keys(data).find((actualKey) => normalize(actualKey) === target);
    if (matchKey && data[matchKey] !== undefined && data[matchKey] !== null && data[matchKey] !== '') {
      return data[matchKey];
    }
  }
  return '';
};

// Constructs complete Member Object from document
const memberFromDocument = (document) => {
  const data = document.data();
  
  // Hardened Full Name Construction
  const firstName = getVal(data, 'First Name', 'firstName', 'fname');
  const middleName = getVal(data, 'Middle Name', 'middleName', 'mname');
  const lastName = getVal(data, 'Last Name', 'lastName', 'lname');
  const suffix = getVal(data, 'Suffix', 'suffix');

  let constructedName = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim();
  if (!constructedName) {
    constructedName = getVal(data, 'fullName', 'displayName', 'name', 'username') || 'Registered Member';
  }

  const fancyCallsign = getVal(data, 'Fancy Callsign :', 'Fancy Callsign', 'callsign', 'fancyCallsign', 'netID', 'username');
  const crcCallsign = getVal(data, 'COMRADCOM Callsign', 'ID No.', 'idNumber', 'idNo', 'crcCallsign');
  const amCallsign = getVal(data, 'Amateur Callsign (Optional)', 'Amateur Callsign', 'amateurCallsign', 'amateurCall');

  return {
    id: document.id,
    name: constructedName,
    firstName: firstName || constructedName.split(' ')[0] || '',
    lastName: lastName || constructedName.split(' ').slice(1).join(' ') || '',
    callsign: fancyCallsign || crcCallsign || '—',
    fancyCallsign: fancyCallsign || '—',
    crcCallsign: crcCallsign || '—',
    amCallsign: amCallsign || '—',
    position: getVal(data, 'Position', 'position', 'role', 'rank', 'category') || 'Member',
    membershipType: getVal(data, 'Membership Type', 'membershipType', 'type') || 'Regular',
    status: (data.status || (data.checkedIn ? 'Active' : 'Active')).toUpperCase(),
    address: getVal(data, 'Present Address:', 'Address', 'address', 'location', 'city', 'Home Address'),
    contact: getVal(data, 'Contact Number 1', 'Contact', 'contact', 'phone', 'mobile', 'phoneNumber'),
    email: getVal(data, 'Email Address', 'emailAddress', 'email'),
    sex: getVal(data, 'Sex', 'sex', 'gender'),
    bloodType: getVal(data, 'Blood Type', 'bloodType'),
    emergencyContactPerson: getVal(data, 'Emergency Contact Person', 'emergencyContactPerson'),
    emergencyContactNumber: getVal(data, 'Emergency Contact Number', 'emergencyContactNumber'),
    birthDate: getVal(data, 'Birth date / Birthday', 'birthDate', 'bday')
  };
};

export function UsersScreen() {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    let registryRecords = [];
    let legacyRecords = [];

    const sync = () => {
      const merged = new Map();
      legacyRecords.forEach((member) => {
        const key = (member.callsign || member.id).toString().toLowerCase().trim();
        merged.set(key, member);
      });
      registryRecords.forEach((member) => {
        const key = (member.callsign || member.id).toString().toLowerCase().trim();
        merged.set(key, { ...(merged.get(key) || {}), ...member });
      });

      const sorted = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
      setMembers(sorted);
      setLoading(false);
    };

    const onError = (snapshotError) => {
      console.error('Unable to load COMRADCOM registry:', snapshotError);
      setError('The member registry is currently unavailable.');
      setLoading(false);
    };

    const stopRegistry = onSnapshot(collection(db, 'members'), (snapshot) => { 
      registryRecords = snapshot.docs.map(memberFromDocument); 
      setError(''); 
      sync(); 
    }, onError);

    const stopLegacy = onSnapshot(collection(db, 'netcall_members'), (snapshot) => { 
      legacyRecords = snapshot.docs.map(memberFromDocument); 
      setError(''); 
      sync(); 
    }, onError);

    return () => { 
      stopRegistry(); 
      stopLegacy(); 
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return !query 
      ? members 
      : members.filter((m) => 
          [m.name, m.callsign, m.crcCallsign, m.amCallsign, m.position, m.membershipType, m.address, m.contact, m.email]
            .some((val) => String(val || '').toLowerCase().includes(query))
        );
  }, [members, searchQuery]);

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-4 sm:px-6 py-5 lg:px-8 lg:py-8 overflow-y-auto pb-6">
      
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-slide-up">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">OFFICIAL REGISTRY</span>
          <h2 className="text-2xl font-black leading-tight text-slate-900 lg:text-3xl">Member Directory</h2>
          <p className="mt-1 text-xs text-slate-500">Verified COMRADCOM operators, officers, and national members</p>
        </div>
        <div className="flex gap-3">
          <Stat label="Total Members" value={members.length} color="text-primary" />
        </div>
      </div>

      {/* Search Input */}
      <div className="relative animate-slide-up lg:max-w-xl" style={{ animationDelay: '0.05s' }}>
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="search" 
          placeholder="Search full name, callsign, role, address, or phone..." 
          value={searchQuery} 
          onChange={(event) => setSearchQuery(event.target.value)} 
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-sm" 
        />
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          <div className="flex items-center gap-2 font-bold"><AlertCircle size={18} /> Directory Unavailable</div>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : (
        <div className="grid gap-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member, index) => (
            <MemberCard 
              key={member.id || index} 
              member={member} 
              index={index} 
              onSelect={() => setSelectedMember(member)} 
            />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-400 glass-card rounded-3xl p-8">
          <UsersRound size={40} className="mb-3 text-slate-300" />
          <span className="text-sm font-bold text-slate-700">No members match your search</span>
          <p className="text-xs text-slate-400 mt-1">Try typing a callsign or full name.</p>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#003F87] to-[#0056B3] text-white relative">
              <button 
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl font-black text-white">
                  {selectedMember.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedMember.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wider">
                      {selectedMember.callsign}
                    </span>
                    <span className="text-xs text-white/80 font-medium">
                      {selectedMember.position}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Callsigns Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Fancy Callsign</span>
                  <span className="font-black text-primary text-xs mt-0.5 block">{selectedMember.fancyCallsign}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">CRC Callsign</span>
                  <span className="font-black text-blue-600 text-xs mt-0.5 block">{selectedMember.crcCallsign}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Amateur Call</span>
                  <span className="font-black text-slate-700 text-xs mt-0.5 block">{selectedMember.amCallsign}</span>
                </div>
              </div>

              {/* Personal Details List */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="font-bold text-slate-400">Membership Type</span>
                  <span className="font-black text-slate-800">{selectedMember.membershipType}</span>
                </div>
                
                {selectedMember.address && (
                  <div className="flex items-start justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400 shrink-0 mr-2 flex items-center gap-1">
                      <MapPin size={12} className="text-primary" /> Present Address
                    </span>
                    <span className="font-semibold text-slate-800 text-right">{selectedMember.address}</span>
                  </div>
                )}

                {selectedMember.contact && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400 flex items-center gap-1">
                      <Phone size={12} className="text-green-600" /> Contact Number
                    </span>
                    <a href={`tel:${selectedMember.contact}`} className="font-bold text-green-700 hover:underline">
                      {selectedMember.contact}
                    </a>
                  </div>
                )}

                {selectedMember.email && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400 flex items-center gap-1">
                      <Mail size={12} className="text-primary" /> Email
                    </span>
                    <a href={`mailto:${selectedMember.email}`} className="font-semibold text-primary hover:underline truncate max-w-[200px]">
                      {selectedMember.email}
                    </a>
                  </div>
                )}

                {selectedMember.bloodType && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400">Blood Type</span>
                    <span className="font-black text-red-600">{selectedMember.bloodType}</span>
                  </div>
                )}

                {selectedMember.emergencyContactPerson && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="font-bold text-slate-400">Emergency Contact</span>
                    <span className="font-semibold text-slate-800">{selectedMember.emergencyContactPerson} ({selectedMember.emergencyContactNumber || 'N/A'})</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function Stat({ label, value, color }) { 
  return (
    <div className="rounded-2xl bg-white px-4 py-2.5 text-center shadow-sm border border-slate-200/80">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
    </div>
  ); 
}

function Loading() { 
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-400">
      <RefreshCw size={32} className="mb-3 animate-spin text-primary" />
      <span className="text-sm font-bold">Synchronizing member database...</span>
    </div>
  ); 
}

function MemberCard({ member, index, onSelect }) {
  const initials = member.name.substring(0, 2).toUpperCase();

  return (
    <article 
      onClick={onSelect}
      className="animate-slide-up rounded-3xl border border-white/80 bg-white/90 p-4 sm:p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between"
      style={{ animationDelay: `${Math.min(0.05 + index * 0.02, 0.4)}s` }}
    >
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#003F87] to-[#0056B3] text-white shadow-md">
            <span className="text-sm font-black tracking-wider">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black text-slate-900 leading-tight">{member.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-black text-primary font-mono">{member.callsign}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-500">
                {member.membershipType}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">{member.position}</p>
          </div>
        </div>
      </div>

      {(member.address || member.contact || member.email) && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-medium">
          {member.address && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="text-primary shrink-0" />
              <span className="truncate">{member.address}</span>
            </span>
          )}
          {member.email && (
            <span className="flex items-center gap-1.5 truncate">
              <Mail size={12} className="shrink-0 text-primary" />
              <span className="truncate">{member.email}</span>
            </span>
          )}
          {member.contact && (
            <span className="flex items-center gap-1.5 font-bold text-green-700">
              <Phone size={12} className="shrink-0 text-green-600" />
              <span>{member.contact}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
