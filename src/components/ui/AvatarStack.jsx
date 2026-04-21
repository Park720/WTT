import Avatar from './Avatar';

export default function AvatarStack({ users = [], size = 26, max = 4 }) {
  const show = users.slice(0, max);
  const extra = Math.max(0, users.length - max);

  return (
    <div className="flex items-center">
      {show.map((user, i) => (
        <div key={user?.id ?? i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
          <Avatar user={user} size={size} ring />
        </div>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-2 ring-white font-mono select-none"
          style={{ width: size, height: size, marginLeft: -8, fontSize: Math.max(10, size * 0.38) }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
