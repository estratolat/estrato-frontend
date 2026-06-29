type Canal = 'whatsapp' | 'messenger' | 'instagram' | 'form' | 'sms' | 'email';

const config: Record<Canal, { label: string; className: string }> = {
  whatsapp: { label: 'WhatsApp', className: 'bg-green-100 text-green-700' },
  messenger: { label: 'Messenger', className: 'bg-blue-100 text-blue-700' },
  instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-700' },
  form: { label: 'Formulario', className: 'bg-secondary-100 text-secondary-700' },
  sms: { label: 'SMS', className: 'bg-amber-100 text-amber-700' },
  email: { label: 'Email', className: 'bg-purple-100 text-purple-700' },
};

export default function CanalBadge({ canal }: { canal: Canal | string }) {
  const c = config[canal as Canal] || { label: canal, className: 'bg-secondary-100 text-secondary-700' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.className}`}>
      {c.label}
    </span>
  );
}
