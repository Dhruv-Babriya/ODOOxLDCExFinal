'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
  createProductCategoryAction,
} from '@/actions/shop';
import {
  Package,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url: string | null;
  category_id: string | null;
  product_categories: { name: string } | null;
  inventory?: { quantity_on_hand: number } | null;
}

export interface ProductManagerProps {
  initialProducts: Product[];
  categories: Category[];
}

export function ProductManager({ initialProducts, categories }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    price: '',
    imageUrl: '',
    lowStockThreshold: '5',
    initialStock: '10',
    isActive: true,
  });

  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || p.category_id === selectedCategory;

    const matchesActive =
      activeFilter === 'ALL' ||
      (activeFilter === 'ACTIVE' && p.is_active) ||
      (activeFilter === 'INACTIVE' && !p.is_active);

    return matchesSearch && matchesCategory && matchesActive;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const res = await createProductAction({
      sku: formData.sku,
      name: formData.name,
      description: formData.description || null,
      categoryId: formData.categoryId || null,
      price: Number(formData.price),
      imageUrl: formData.imageUrl || null,
      lowStockThreshold: Number(formData.lowStockThreshold),
      initialStock: Number(formData.initialStock),
      isActive: formData.isActive,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Product created successfully.' });
      setIsCreateOpen(false);
      // Optimistic update
      const newCategory = categories.find((c) => c.id === formData.categoryId);
      setProducts([
        {
          id: res.data.productId,
          sku: formData.sku.toUpperCase(),
          name: formData.name,
          description: formData.description || null,
          category_id: formData.categoryId || null,
          price: Number(formData.price),
          low_stock_threshold: Number(formData.lowStockThreshold),
          is_active: formData.isActive,
          image_url: formData.imageUrl || null,
          product_categories: newCategory ? { name: newCategory.name } : null,
          inventory: { quantity_on_hand: Number(formData.initialStock) },
        },
        ...products,
      ]);
      setFormData({
        sku: '',
        name: '',
        description: '',
        categoryId: '',
        price: '',
        imageUrl: '',
        lowStockThreshold: '5',
        initialStock: '10',
        isActive: true,
      });
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsLoading(true);
    setFeedback(null);

    const res = await updateProductAction({
      id: editingProduct.id,
      name: formData.name,
      description: formData.description || null,
      categoryId: formData.categoryId || null,
      price: Number(formData.price),
      imageUrl: formData.imageUrl || null,
      lowStockThreshold: Number(formData.lowStockThreshold),
      isActive: formData.isActive,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Product updated successfully.' });
      const newCategory = categories.find((c) => c.id === formData.categoryId);
      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formData.name,
                description: formData.description || null,
                category_id: formData.categoryId || null,
                price: Number(formData.price),
                low_stock_threshold: Number(formData.lowStockThreshold),
                image_url: formData.imageUrl || null,
                is_active: formData.isActive,
                product_categories: newCategory ? { name: newCategory.name } : null,
              }
            : p
        )
      );
      setEditingProduct(null);
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  const handleToggleActive = async (product: Product) => {
    const newStatus = !product.is_active;
    const res = await toggleProductActiveAction({ id: product.id, isActive: newStatus });
    if (res.success) {
      setProducts(products.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p)));
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const res = await createProductCategoryAction({
      name: categoryName,
      description: categoryDesc || null,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: `Category "${categoryName}" created.` });
      categories.push({ id: res.data.categoryId, name: categoryName });
      setIsCategoryOpen(false);
      setCategoryName('');
      setCategoryDesc('');
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.category_id || '',
      price: product.price.toString(),
      imageUrl: product.image_url || '',
      lowStockThreshold: product.low_stock_threshold.toString(),
      initialStock: '0',
      isActive: product.is_active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-400" />
            <span>Product Catalog Management</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Configure athletic gear (rackets, balls, shoes, accessories, apparel) with unified live stock.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-zinc-700 hover:bg-zinc-800"
            onClick={() => setIsCategoryOpen(true)}
          >
            <FolderPlus className="h-3.5 w-3.5 text-zinc-400" />
            <span>Add Category</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="text-xs gap-1.5 shadow-emerald-950/40"
            onClick={() => {
              setFormData({
                sku: '',
                name: '',
                description: '',
                categoryId: categories[0]?.id || '',
                price: '',
                imageUrl: '',
                lowStockThreshold: '5',
                initialStock: '10',
                isActive: true,
              });
              setIsCreateOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Product</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-zinc-800 bg-zinc-900/60 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
            <Input
              placeholder="Search by product name, SKU, or specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-white">Products Catalog</CardTitle>
            <p className="text-xs text-zinc-400">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name & Specs</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Live Stock</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((prod) => {
                    const stock = prod.inventory?.quantity_on_hand ?? 0;
                    const isLow = stock <= prod.low_stock_threshold;

                    return (
                      <tr key={prod.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{prod.sku}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="text-zinc-100 font-medium">{prod.name}</div>
                          {prod.description && (
                            <div className="text-[11px] text-zinc-500 line-clamp-1">{prod.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-400">
                          {prod.product_categories?.name || 'Uncategorized'}
                        </td>
                        <td className="py-2.5 px-3 text-white font-semibold">
                          {formatCurrency(prod.price)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{stock}</span>
                            {isLow && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                Low (&le;{prod.low_stock_threshold})
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {prod.is_active ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                              Deactivated
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] border-zinc-800 hover:bg-zinc-800"
                              onClick={() => openEditModal(prod)}
                            >
                              <Edit2 className="h-3 w-3 text-zinc-400" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant={prod.is_active ? 'secondary' : 'primary'}
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleToggleActive(prod)}
                            >
                              {prod.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 font-sans text-zinc-500">
                      No products matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE PRODUCT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Create New Product</span>
              </CardTitle>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <form onSubmit={handleCreateProduct}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">SKU Code *</label>
                    <Input
                      required
                      placeholder="e.g. RCK-WIL-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Product Name *</label>
                  <Input
                    required
                    placeholder="e.g. Wilson Pro Staff 97 v14"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Technical specifications, grip size, string tension, materials..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Retail Price (₹) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="999.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Low-Stock Alert Level</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Initial Stock</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveProduct"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isActiveProduct" className="text-zinc-300">
                    Product is active and visible in catalog & POS
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                    Save Product
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-emerald-400" />
                <span>Edit Product — {editingProduct.sku}</span>
              </CardTitle>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <form onSubmit={handleUpdateProduct}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">SKU (Read-only)</label>
                    <Input disabled value={formData.sku} className="font-mono bg-zinc-900 text-zinc-400" />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Product Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Retail Price (₹) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Low-Stock Alert Level</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="editIsActive" className="text-zinc-300">
                    Product is active
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingProduct(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-emerald-400" />
                <span>Add Product Category</span>
              </CardTitle>
              <button
                onClick={() => setIsCategoryOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <form onSubmit={handleCreateCategory}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Category Name *</label>
                  <Input
                    required
                    placeholder="e.g. Grips & Dampeners"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Description</label>
                  <Input
                    placeholder="Short description of items in this category"
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCategoryOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                    Create Category
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
