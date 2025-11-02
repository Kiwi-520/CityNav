"use client";

import React from "react";
import { FiFilter, FiX } from "react-icons/fi";
import "@/features/essential-maps/styles/poi-filter.css";

interface FilterOption {
  id: string;
  label: string;
  icon: string;
  count: number;
}

interface POIFilterComponentProps {
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const filterOptions: FilterOption[] = [
  { id: "restroom", label: "Restrooms", icon: "🚻", count: 12 },
  { id: "atm", label: "ATMs", icon: "🏧", count: 18 },
  { id: "water", label: "Water Stations", icon: "💧", count: 8 },
  { id: "food", label: "Food Courts", icon: "🍽️", count: 15 },
];

const POIFilterComponent: React.FC<POIFilterComponentProps> = ({
  activeFilters,
  onFilterChange,
  isOpen,
  onToggle,
}) => {
  const handleFilterToggle = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      onFilterChange(activeFilters.filter((f) => f !== filterId));
    } else {
      onFilterChange([...activeFilters, filterId]);
    }
  };

  const clearAllFilters = () => {
    onFilterChange([]);
  };

  const activeCount = activeFilters.length;

  return (
    <>
      {/* Filter Toggle Button */}
      <button
        className={`filterToggle ${isOpen ? "active" : ""}`}
        onClick={onToggle}
      >
        <FiFilter size={20} />
        Filter
        {activeCount > 0 && <span className="filterBadge">{activeCount}</span>}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          <div className="backdrop" onClick={onToggle} />
          <div className="filterPanel">
            <div className="filterHeader">
              <h3>Filter POIs</h3>
              <button className="closeBtn" onClick={onToggle}>
                <FiX size={20} />
              </button>
            </div>

            <div className="filterContent">
              <div className="filterActions">
                <span className="resultText">
                  {activeCount === 0
                    ? "All categories"
                    : `${activeCount} selected`}
                </span>
                {activeCount > 0 && (
                  <button className="clearBtn" onClick={clearAllFilters}>
                    Clear all
                  </button>
                )}
              </div>

              <div className="filterOptions">
                {filterOptions.map((option) => {
                  const isActive = activeFilters.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`filterOption ${isActive ? "active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleFilterToggle(option.id)}
                        className="filterCheckbox"
                      />
                      <div className="optionContent">
                        <div className="optionLeft">
                          <span className="optionIcon">{option.icon}</span>
                          <span className="optionLabel">{option.label}</span>
                        </div>
                        <span className="optionCount">{option.count}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="filterFooter">
                <button className="applyBtn" onClick={onToggle}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default POIFilterComponent;
