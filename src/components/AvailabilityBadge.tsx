import {Info, ShoppingBag, Tv} from 'lucide-react';
import {Fragment} from 'react';
import type {AvailabilityInfo, StreamingOffer} from '../types/movie';
import {formatCheckedTimestamp} from '../utils/formatters';

interface AvailabilityBadgeProps {
  availability: AvailabilityInfo;
}

const ACCESS_LABELS: Record<StreamingOffer['accessType'], string> = {
  streaming: 'Streaming',
  'free-with-ads': 'Free with ads',
  rent: 'Rent',
  buy: 'Buy digitally',
};

export function AvailabilityBadge({availability}: AvailabilityBadgeProps) {
  const checkedText = formatCheckedTimestamp(availability.lastCheckedIso);

  if (availability.status === 'unverified') {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0B0D14]/75 p-3.5 text-sm">
        <div className="flex items-start gap-2.5 text-[#A8B1C7]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4D4D]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-[#F6F4EE]">Availability not verified</p>
            <p className="text-xs leading-relaxed text-[#A8B1C7]">
              Streaming availability could not be verified right now for {availability.countryName} ({availability.countryCode}).
            </p>
            <p className="text-xs text-[#A8B1C7]/80">Last checked: {checkedText}</p>
          </div>
        </div>
      </div>
    );
  }

  if (availability.status === 'not-found' || availability.offers.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0B0D14]/75 p-3.5 text-sm">
        <div className="flex items-start gap-2.5">
          <Tv className="mt-0.5 h-4 w-4 shrink-0 text-[#A8B1C7]" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="font-medium text-[#F6F4EE]">Not currently streaming</p>
            <p className="text-xs leading-relaxed text-[#A8B1C7]">
              {availability.message}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A8B1C7]/85">
              <span>Country: {availability.countryName} ({availability.countryCode})</span>
              <span aria-hidden="true">·</span>
              <span>Checked: {checkedText}</span>
            </div>
            {availability.sourceAttribution ? (
              <p className="text-[11px] text-[#A8B1C7]/80">{availability.sourceAttribution}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const grouped = new Map<StreamingOffer['accessType'], StreamingOffer[]>();
  for (const offer of availability.offers) {
    const list = grouped.get(offer.accessType) ?? [];
    list.push(offer);
    grouped.set(offer.accessType, list);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B0D14]/75 p-3.5 text-sm space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A8B1C7]">
        <span>
          Region: <strong className="font-medium text-[#F6F4EE]">{availability.countryName} ({availability.countryCode})</strong>
        </span>
        <span className="tabular-nums">Checked {checkedText}</span>
      </div>

      <dl className="space-y-2">
        {Array.from(grouped.entries()).map(([accessType, offers]) => (
          <div key={accessType} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <dt className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2DD496] shrink-0">
              {accessType === 'rent' || accessType === 'buy' ? (
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Tv className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{ACCESS_LABELS[accessType]}:</span>
            </dt>
            <dd className="text-xs leading-relaxed text-[#F6F4EE]">
              {offers.map((offer, idx) => (
                <Fragment key={`${offer.providerName}-${accessType}-${idx}`}>
                  {idx > 0 ? ', ' : null}
                  {offer.offerUrl ? (
                    <a
                      href={offer.offerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-white/30 underline-offset-2 hover:text-[#00D4FF] hover:decoration-[#00D4FF]"
                    >
                      {offer.providerName}
                    </a>
                  ) : (
                    <span>{offer.providerName}</span>
                  )}
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/8">
        <span className="text-xs text-[#A8B1C7]">Verify service before watching</span>
        {availability.sourceAttribution ? (
          <span className="text-[11px] text-[#A8B1C7]/80">{availability.sourceAttribution}</span>
        ) : null}
      </div>
    </div>
  );
}
