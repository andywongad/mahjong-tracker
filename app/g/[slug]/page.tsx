import { ShareScreen } from '@/components/share/ShareScreen';

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShareScreen slug={slug} />;
}
