import { FiMoon, FiSun } from 'react-icons/fi';
import { Label } from './ui/Label';

export default function NewsSessionLabel({ session }) {
  if (!session) return null;
  const before = session === 'beforeOpen';
  return <Label tone={session} icon={before ? <FiSun /> : <FiMoon />}
    title={before ? 'Nyheten publicerades före börsöppning' : 'Nyheten publicerades efter börsstängning'}>
    {before ? 'Före öppning' : 'Efter stängning'}
  </Label>;
}
