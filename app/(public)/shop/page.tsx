import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, PackageCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PRODUCTS = [
  {
    name: 'Pro Staff 97 Tennis Racket',
    category: 'Rackets',
    sku: 'PRO-RCK-001',
    price: 8999,
    stock: 12,
    desc: 'Tour-grade precision racket with carbon fiber weave.',
  },
  {
    name: 'Championship Tennis Balls (Can of 3)',
    category: 'Balls & Equipment',
    sku: 'BAL-TEN-003',
    price: 450,
    stock: 45,
    desc: 'Extra duty felt balls approved for all court surfaces.',
  },
  {
    name: 'Four-Piece Red Leather Cricket Ball',
    category: 'Balls & Equipment',
    sku: 'BAL-CRK-001',
    price: 650,
    stock: 30,
    desc: 'Handmade leather ball meeting match regulation specs.',
  },
  {
    name: 'Gel-Court Performance Shoes',
    category: 'Footwear',
    sku: 'SHO-CRT-001',
    price: 5499,
    stock: 8,
    desc: 'Superior lateral stability and cushioning for clay & hard courts.',
  },
  {
    name: 'Champions Club Athletic Polo',
    category: 'Apparel',
    sku: 'APP-POLO-001',
    price: 1299,
    stock: 25,
    desc: 'Quick-drying micro-mesh fabric with embroidered club emblem.',
  },
];

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          Champions Pro Shop
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Athletic Gear & Apparel</h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          Shared live inventory across counter purchases and online member orders. Members receive up to 15% automatic discount.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRODUCTS.map((prod) => (
          <Card key={prod.sku} className="border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{prod.category}</Badge>
                <span className="text-[11px] font-mono text-zinc-500">{prod.sku}</span>
              </div>
              <CardTitle className="text-lg text-white mt-2">{prod.name}</CardTitle>
              <CardDescription className="text-xs text-zinc-400">{prod.desc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{formatCurrency(prod.price)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>{prod.stock} in stock</span>
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 bg-zinc-950/60 p-2 rounded border border-zinc-800">
                Gold Member price: <span className="text-emerald-400 font-semibold">{formatCurrency(prod.price * 0.85)}</span>
              </div>
            </CardContent>

            <div className="p-6 pt-0">
              <Link href="/dashboard/shop" className="w-full">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Order / Reserve in Portal</span>
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
