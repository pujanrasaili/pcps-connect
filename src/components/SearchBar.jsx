import { FaSearch } from "react-icons/fa";

export default function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full">
      <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-field"
        style={{ paddingLeft: "2.75rem" }}
      />
    </div>
  );
}
