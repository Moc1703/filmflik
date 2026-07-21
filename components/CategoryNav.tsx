"use client";

import Link from "next/link";
import { categoryHref } from "@/lib/categories";

interface CategoryNavProps {
  categories: string[];
  /** Current category label, or null when on the All / catalog overview. */
  active: string | null;
}

const linkClass = (isActive: boolean) =>
  `text-sm font-semibold tracking-wide transition-colors ${
    isActive ? "text-brand" : "text-muted hover:text-foreground"
  }`;

export default function CategoryNav({ categories, active }: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <nav
      className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3"
      aria-label="Categories"
    >
      <Link
        href="/categories"
        className={linkClass(active === null)}
        aria-current={active === null ? "page" : undefined}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = active === category;
        return (
          <Link
            key={category}
            href={categoryHref(category)}
            className={linkClass(isActive)}
            aria-current={isActive ? "page" : undefined}
          >
            {category}
          </Link>
        );
      })}
    </nav>
  );
}
