import React from 'react';
import { User, Mail, ShieldCheck, CircleDot, BadgeCheck } from 'lucide-react';

interface UserProfile {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface Props {
  user: UserProfile;
}

const UserCard: React.FC<Props> = ({ user }) => {
  // Defensive: fallback values for all fields
  const roleDisplay = user?.role ? user.role.replace('ROLE_', '').toLowerCase() : 'unknown';
  const statusColor =
    user?.status === 'ACTIVE'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
      : 'text-slate-600 bg-slate-50 border-slate-100';

  // Capitalize first letter of firstName and lastName
  const capitalize = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  const firstName = capitalize(user?.firstName);
  const lastName = capitalize(user?.lastName);

  return (
    <div className="max-w-sm bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* Header Profile Section */}
      <div className="bg-slate-900 p-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-indigo-500 border-4 border-slate-800 flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-inner">
          {firstName.charAt(0)}
          {lastName.charAt(0)}
        </div>
        <h2 className="text-white text-xl font-bold tracking-tight">
          {firstName + ' ' + lastName}
        </h2>
      </div>

      {/* Body Section */}
      <div className="p-6 space-y-4">
        {/* Role Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span className="text-sm font-semibold capitalize">{roleDisplay}</span>
          </div>
          <div
            className={`px-3 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${statusColor}`}
          >
            <CircleDot size={10} className="animate-pulse" />
            {user?.status || 'UNKNOWN'}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Email */}
        <div className="flex items-center gap-3 group">
          <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Mail size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              Email Address
            </span>
            <span className="text-sm text-slate-700 font-medium truncate">
              {user?.email || 'N/A'}
            </span>
          </div>
        </div>

        {/* Account Verification Info */}
        <div className="mt-6 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
          <BadgeCheck size={16} className="text-indigo-600" />
          <span className="text-xs text-indigo-700 font-bold">Verified System User</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
