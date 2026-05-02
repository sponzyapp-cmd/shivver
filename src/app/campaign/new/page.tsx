'use client';

import {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {useAuth} from '@/context/auth-provider';
import {ArrowLeft, Briefcase, DollarSign, Filter, Globe, Hash, List, Type} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';

export default function PostCampaignPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const {session} = useAuth();
  const {toast} = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setLoading(true);
    try {
      // Simple POST to AGI endpoint - customize as needed
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({title, description, brand_name: brandName, budget: Number(budget), category}),
      });

      if (!res.ok) throw new Error('Failed to create campaign');

      toast({title: 'Campaign created!', description: 'Your campaign is now live.'});
      router.push('/brain');
    } catch (err: any) {
      toast({title: 'Error', description: err.message, variant: 'destructive'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 pb-28">
      <Button variant="ghost" asChild className="-ml-4 rounded-xl">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </Button>

      <div className="rounded-[2rem] border bg-gradient-to-br from-muted/35 via-background to-muted/10 px-5 py-5 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] tracking-[0.2em] text-primary mb-3">
          <Briefcase className="w-3.5 h-3.5" />
          CAMPAIGNS
        </div>
        <h1 className="text-2xl tracking-tight">Post a Campaign</h1>
        <p className="text-xs text-muted-foreground mt-1.5">
          Fill out the details below to connect with talented creators.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-[2rem] border-none shadow-none bg-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Type className="w-4 h-4 text-primary" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Brand</Label>
              <Input placeholder="Your brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Campaign Title</Label>
              <Input placeholder="Campaign name" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
              <Textarea placeholder="Describe your campaign..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-none bg-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-4 h-4 text-primary" />
              Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-none bg-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-4 h-4 text-primary" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Input type="number" placeholder="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button type="submit" className="w-full h-14 text-base rounded-xl" disabled={loading}>
            {loading ? 'Creating…' : 'Post Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}