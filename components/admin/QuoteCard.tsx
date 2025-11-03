import React from 'react';
import { Quote } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface QuoteCardProps {
  quote: Quote;
  onApprove: (quote: Quote) => void;
  onReject: (quoteId: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onApprove, onReject }) => {
  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
            <p className="font-bold text-[#195606]">{quote.projectType}</p>
            <p className="text-sm text-stone-600 font-semibold">{quote.userDetails.name} from {quote.userDetails.company}</p>
            <p className="text-xs text-stone-500">{quote.userDetails.email} | {quote.userDetails.phone}</p>
            <p className="text-xs text-stone-400">Submitted: {new Date(quote.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-sm md:text-right">
             <p>Pages: <span className="font-semibold">{quote.pageCount}</span></p>
             <p>Cost: <span className="font-semibold">${quote.totalCost.toFixed(2)}</span></p>
             <p>Hours: <span className="font-semibold">{quote.timeAllowance}</span></p>
        </div>
      </div>
       {quote.aiSummary && (
        <div className="mt-4 pt-4 border-t border-stone-200">
            <h4 className="text-sm font-semibold text-[#433e3c] mb-1">AI Summary &amp; Analysis</h4>
            <p className="text-sm text-stone-600 italic">"{quote.aiSummary}"</p>
            {quote.aiSuggestionRationale && (
                <p className="mt-2 text-xs text-green-800 bg-green-50 p-2 rounded-md">
                    <span className="font-semibold">Rationale:</span> {quote.aiSuggestionRationale}
                </p>
            )}
        </div>
      )}
      {quote.sourceFiles.length > 0 && (
        <div className="mt-4 pt-2 border-t border-stone-200">
          <p className="text-sm font-semibold mb-1">Source Files:</p>
          <ul className="text-sm space-y-1">
            {quote.sourceFiles.map(f => (
              <li key={f.name}>
                <a href={f.downloadURL} target="_blank" rel="noopener noreferrer" className="text-green-800 hover:underline">
                    {f.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={() => onReject(quote.id)} variant="danger" className="py-1 px-3 text-sm">Reject</Button>
        <Button onClick={() => onApprove(quote)} className="py-1 px-3 text-sm">Approve & Create Project</Button>
      </div>
    </Card>
  );
};

export default QuoteCard;