interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function FollowUpSuggestions({ suggestions, onSelect }: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 ml-11 mt-1 mb-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 rounded-lg text-[12px] text-gray-500 bg-white/[0.03] border border-white/[0.06] hover:text-purple-300 hover:bg-purple-500/[0.06] hover:border-purple-500/20 transition-all"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
