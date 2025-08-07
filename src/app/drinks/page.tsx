'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function DrinksList() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const drinks = useQuery(api.drinks.listDrinks);
  const categories = useQuery(api.categories.listCategories);

  const loading = !drinks || !categories;
  const error = null; // Convex hooks don't throw unless you handle it explicitly

  // Category filtering
  const filteredDrinks = useMemo(() => {
    if (!drinks) return [];
    return selectedCategory === 'all'
      ? drinks
      : drinks.filter((d) => d.categoryId === selectedCategory);
  }, [selectedCategory, drinks]);

  // Grouped by category name
  const groupedDrinks = useMemo(() => {
    if (!filteredDrinks || !categories) return {};
    return filteredDrinks.reduce((acc: Record<string, typeof filteredDrinks>, drink) => {
      const category = categories.find((cat) => cat._id === drink.categoryId);
      const categoryName = category?.name ?? 'Other';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(drink);
      return acc;
    }, {});
  }, [filteredDrinks, categories]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Error loading drinks</div>;

  return (
    <div className="max-w-lg mx-auto bg-gray-900 my-8 p-8 rounded-xl shadow-lg">
      <h1 className="text-center font-serif mb-6 tracking-widest text-2xl text-white">Drinks Menu</h1>

      <div className="mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full p-2 border rounded-lg text-white"
        >
          <option value="all" className="text-black">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id} className="text-black">
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        {Object.entries(groupedDrinks).map(([categoryName, drinks]) => (
          <div key={categoryName} className="mb-6">
            <h2 className="text-xl font-bold mb-3 text-white border-b border-gray-400 pb-1">
              {categoryName}
            </h2>
            <ul className="list-none p-0">
              {drinks.map((drink) => (
                <li
                  key={drink._id}
                  className="my-2 p-4 rounded-lg text-lg font-medium flex items-center shadow text-white hover:bg-blue-600 transition duration-200 cursor-pointer border border-gray-700"
                >
                  <span className="flex-1">{drink.name}</span>
                  <span className="ml-4 font-bold">{drink.currentPrice.toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
