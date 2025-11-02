"use client";

import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "./CategoryNavigation.module.css";

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface CategoryNavigationProps {
  categories: Category[];
  pois: any[];
  onCategorySelect: (categoryId: string | null) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  pois,
  onCategorySelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    onCategorySelect(newCategory);
  };

  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    count: pois.filter((poi) => poi.type === cat.id).length,
  }));

  const selectedCat = categoriesWithCounts.find(
    (cat) => cat.id === selectedCategory
  );

  return (
    <div className={styles.categoryNav}>
      <div className={styles.header}>
        <h3>Browse by Category</h3>
        <button
          className={styles.toggleBtn}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.categoryGrid}>
          {categoriesWithCounts.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryCard} ${
                selectedCategory === category.id ? styles.active : ""
              } ${category.count === 0 ? styles.disabled : ""}`}
              onClick={() => handleCategoryClick(category.id)}
              disabled={category.count === 0}
            >
              <span className={styles.icon}>{category.icon}</span>
              <span className={styles.name}>{category.name}</span>
              <span className={styles.count}>{category.count}</span>
            </button>
          ))}
        </div>
      )}

      {selectedCat && !isExpanded && (
        <div className={styles.selectedChip}>
          <span className={styles.icon}>{selectedCat.icon}</span>
          <span>{selectedCat.name}</span>
          <span className={styles.count}>({selectedCat.count})</span>
          <button
            className={styles.clearBtn}
            onClick={() => handleCategoryClick(selectedCat.id)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryNavigation;
