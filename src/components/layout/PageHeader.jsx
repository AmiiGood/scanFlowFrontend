export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          {title}
        </h1>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
