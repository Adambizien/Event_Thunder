import type { ReactNode } from 'react';

type UniformTableProps = {
  headers: string[];
  children: ReactNode;
  containerClassName?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  headerCellClassName?: string;
  bodyClassName?: string;
};

const UniformTable = ({
  headers,
  children,
  containerClassName = 'overflow-x-auto',
  tableClassName = 'w-full',
  headerRowClassName = 'border-b border-white/10 bg-white/5',
  headerCellClassName = 'px-6 py-4 text-left text-sm font-semibold text-gray-300',
  bodyClassName,
}: UniformTableProps) => {
  return (
    <div className={containerClassName}>
      <table className={tableClassName}>
        <thead>
          <tr className={headerRowClassName}>
            {headers.map((header) => (
              <th key={header} className={headerCellClassName}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={bodyClassName}>{children}</tbody>
      </table>
    </div>
  );
};

export default UniformTable;