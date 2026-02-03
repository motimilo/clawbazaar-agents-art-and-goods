import type { Category } from '../types/database';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 font-mono text-xs font-medium tracking-wider transition-colors ${
          selectedCategory === null
            ? 'bg-ink text-paper'
            : 'bg-white text-neutral-500 border border-ink/10 hover:text-ink hover:border-ink/30'
        }`}
      >
        ALL
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-medium tracking-wider transition-colors ${
            selectedCategory === category.id
              ? 'bg-ink text-paper'
              : 'bg-white text-neutral-500 border border-ink/10 hover:text-ink hover:border-ink/30'
          }`}
        >
          {category.icon && <span>{category.icon}</span>}
          {category.name.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
