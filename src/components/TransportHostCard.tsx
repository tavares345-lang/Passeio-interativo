import {CarFront, Compass, Pencil, RotateCcw, X} from 'lucide-react';
import React, {useState} from 'react';
import type {TransportHostProfile} from '../types/tour';

export const DEFAULT_TRANSPORT_HOST: TransportHostProfile = {
  organizationName: 'Minas Transfer & Receptivo Executivo',
  driverName: 'Motorista Particular Credenciado',
  serviceTagline:
    'Traslados privativos, city tour e rotas históricas por Minas Gerais',
  shortBio:
    'Olá! Conduzimos seu passeio por Belo Horizonte e pelas cidades históricas de Minas Gerais com conforto, pontualidade e roteiro personalizado.',
  tourPrompt:
    'Aproveite o trajeto para usar este passeio interativo: explore os pontos turísticos no mapa e em 360°, ouça o guia de áudio e escolha suas próximas paradas.',
};

interface TransportHostCardProps {
  isOpen: boolean;
  profile: TransportHostProfile;
  onSaveProfile: (next: TransportHostProfile) => void;
  onResetProfile: () => void;
  onClose: () => void;
}

export const TransportHostCard: React.FC<TransportHostCardProps> = ({
  isOpen,
  profile,
  onSaveProfile,
  onResetProfile,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TransportHostProfile>(profile);

  if (!isOpen) return null;

  const handleStartEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      organizationName:
        draft.organizationName.trim() || DEFAULT_TRANSPORT_HOST.organizationName,
      driverName: draft.driverName.trim() || DEFAULT_TRANSPORT_HOST.driverName,
      serviceTagline:
        draft.serviceTagline.trim() || DEFAULT_TRANSPORT_HOST.serviceTagline,
      shortBio: draft.shortBio.trim() || DEFAULT_TRANSPORT_HOST.shortBio,
      tourPrompt: draft.tourPrompt.trim() || DEFAULT_TRANSPORT_HOST.tourPrompt,
    });
    setIsEditing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apresentação do transporte turístico"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#090C10]/65 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0E1114]/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/12 text-sky-400">
              <CarFront className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[11px] font-medium tracking-wide text-sky-300 uppercase">
                Seu transporte turístico
              </p>
              <h2 className="font-display mt-0.5 text-lg leading-snug font-semibold text-white">
                {profile.organizationName}
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                {profile.driverName} · {profile.serviceTagline}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Personalizar apresentação"
                aria-label="Personalizar apresentação do motorista ou empresa"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar apresentação"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3 p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Empresa ou serviço
              </label>
              <input
                type="text"
                value={draft.organizationName}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    organizationName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Motorista / Responsável
                </label>
                <input
                  type="text"
                  value={draft.driverName}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      driverName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Especialidade
                </label>
                <input
                  type="text"
                  value={draft.serviceTagline}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      serviceTagline: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Apresentação curta
              </label>
              <textarea
                rows={2}
                value={draft.shortBio}
                onChange={(e) =>
                  setDraft((prev) => ({...prev, shortBio: e.target.value}))
                }
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Convite para o passeio interativo
              </label>
              <textarea
                rows={2}
                value={draft.tourPrompt}
                onChange={(e) =>
                  setDraft((prev) => ({...prev, tourPrompt: e.target.value}))
                }
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onResetProfile();
                  setDraft(DEFAULT_TRANSPORT_HOST);
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Padrão
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-white/12 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                >
                  Salvar apresentação
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-slate-200">
              {profile.shortBio}
            </p>

            <div className="flex items-start gap-2.5 rounded-xl border border-sky-400/25 bg-sky-500/10 p-3.5 text-xs leading-relaxed text-sky-100">
              <Compass
                className="mt-0.5 h-4 w-4 shrink-0 text-sky-400"
                aria-hidden="true"
              />
              <p>{profile.tourPrompt}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-sky-300"
            >
              <Compass className="h-4 w-4" />
              Explorar passeio interativo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
