import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

const AdminPageHeader = ({ title, subtitle, action }: AdminPageHeaderProps) => {
  if (action) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
      <p className="text-gray-400">{subtitle}</p>
    </div>
  );
};

export default AdminPageHeader;