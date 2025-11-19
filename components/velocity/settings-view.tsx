"use client";

import { useState } from "react";
import { Shield, CreditCard, Plug, ChevronRight, LogOut, Landmark } from "lucide-react";

export function SettingsView({ users, accounts, onAddMember, onLinkBank }: { users: any[], accounts: any[], onAddMember: (name: string) => void, onLinkBank: (bank: string, userId: string) => void }) {
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [linkBankName, setLinkBankName] = useState('Chase');
  const [linkUserId, setLinkUserId] = useState(users[0]?.id);

  const handleAddMember = () => {
    if (newMemberName) {
      onAddMember(newMemberName);
      setNewMemberName('');
      setShowMemberModal(false);
    }
  }

  const handleLink = () => {
    onLinkBank(linkBankName, linkUserId);
    setShowLinkModal(false);
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Card */}
      <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-white/10 p-1">
            <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-xl font-bold text-white">A</div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Alex Morgan</h2>
            <p className="text-xs text-slate-400 mb-3">alex@example.com</p>
            <button className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Manage Account</button>
          </div>
        </div>
      </div>

      {/* Family Management */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Family Members</h3>
          <button onClick={() => setShowMemberModal(true)} className="text-xs text-brand-accent hover:text-white transition-colors font-bold">+ Add Member</button>
        </div>
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="glass-card p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-xs font-bold text-white`}>{user.avatar}</div>
                <span className="text-sm font-bold text-white">{user.name}</span>
              </div>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400">{user.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connections */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Integrations</h3>
          <button onClick={() => setShowLinkModal(true)} className="text-xs text-brand-accent hover:text-white transition-colors font-bold">+ Link Bank</button>
        </div>
        <div className="space-y-2">
          {accounts.map(acc => {
            const owner = users.find(u => u.id === acc.userId);
            return (
              <div key={acc.id} className="glass-card p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg text-slate-300"><Landmark size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-white">{acc.bank} - {acc.name}</p>
                    <p className="text-[10px] text-slate-500">Linked to {owner ? owner.name : 'Unknown'}</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { icon: Shield, label: 'Security', sub: '2FA Enabled' },
          { icon: CreditCard, label: 'Billing', sub: 'Pro Plan • $12/mo' },
          { icon: Plug, label: 'Integrations', sub: '3 Banks Connected' }
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl bg-glass-100 border border-white/5 hover:bg-glass-200 transition-all group">
            <div className="flex items-center gap-4">
              <item.icon className="text-slate-400 group-hover:text-brand-accent transition-colors w-5 h-5" />
              <div className="text-left">
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.sub}</p>
              </div>
            </div>
            <ChevronRight className="text-slate-600 w-4 h-4" />
          </button>
        ))}
      </div>
      
      <button className="w-full py-4 text-xs font-bold text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl transition-colors">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xs p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Family Member</h3>
            <input
              type="text"
              placeholder="Name"
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white mb-4 focus:outline-none focus:border-brand-primary"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowMemberModal(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10">Cancel</button>
              <button onClick={handleAddMember} className="flex-1 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-accent">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Link Bank Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xs p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Link Bank Account</h3>
            <p className="text-xs text-slate-400 mb-4">Simulating Plaid Link flow</p>

            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Institution</label>
            <select value={linkBankName} onChange={(e) => setLinkBankName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white mb-4 focus:outline-none focus:border-brand-primary [&>option]:bg-dark-900">
              <option value="Chase">Chase</option>
              <option value="Amex">American Express</option>
              <option value="Citi">Citi</option>
              <option value="Wells Fargo">Wells Fargo</option>
              <option value="Bank of America">Bank of America</option>
            </select>

            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Assign to User</label>
            <select value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white mb-6 focus:outline-none focus:border-brand-primary [&>option]:bg-dark-900">
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <div className="flex gap-3">
              <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10">Cancel</button>
              <button onClick={handleLink} className="flex-1 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-accent">Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
