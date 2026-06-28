import { ExternalLink, Landmark, MapPin, Info } from 'lucide-react'
import { getUpdatesForProvince } from '../lib/regulatoryLinks'
import { PROVINCES } from '../lib/constants'

// Veille réglementaire — affiche les liens officiels (fédéral + province de l'organisation).
// Chaque carte renvoie vers la page officielle du gouvernement, toujours à jour.
export default function RegulatoryUpdates({ org }) {
  const province = org?.province ?? null
  const { federal, provincial } = getUpdatesForProvince(province)
  const provinceName = PROVINCES.find((p) => p.code === province)?.name ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="bg-mist rounded-xl p-2.5 flex-shrink-0">
            <Info size={18} className="text-steel" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-extrabold mb-1">
              Dernières mises à jour réglementaires
            </h2>
            <p className="text-[13px] text-[#5E7385] leading-relaxed">
              Suivez les normes du travail et les lois d'immigration (IRCC / EDSC) qui touchent
              vos travailleurs étrangers et leurs droits. Chaque sujet renvoie vers la{' '}
              <span className="font-semibold">page officielle du gouvernement</span>, tenue à jour
              par l'autorité compétente — vous y verrez toujours la dernière version.
              {provinceName ? (
                <>
                  {' '}Les liens provinciaux ci-dessous correspondent à votre lieu d'établissement :{' '}
                  <span className="font-semibold text-deep">{provinceName}</span>.
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Fédéral — toujours affiché */}
      <UpdateSection
        Icon={Landmark}
        title="Fédéral — IRCC / EDSC"
        subtitle="S'applique à tous les employeurs de travailleurs étrangers au Canada."
        items={federal}
      />

      {/* Provincial / territorial — selon le lieu d'établissement */}
      {province ? (
        <UpdateSection
          Icon={MapPin}
          title={`Provincial / territorial — ${provinceName ?? province}`}
          subtitle="Normes du travail et santé-sécurité de votre province d'établissement."
          items={provincial}
        />
      ) : (
        <div className="card bg-mist border-0">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-steel flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-deep leading-relaxed">
              Aucune province d'établissement n'est renseignée pour votre organisation. Ajoutez
              votre <span className="font-semibold">lieu d'établissement</span> dans les paramètres
              de l'organisation pour recevoir les mises à jour provinciales et territoriales
              applicables.
            </p>
          </div>
        </div>
      )}

      <p className="text-[11.5px] text-[#9FB0BF] leading-relaxed px-1">
        Les liens pointent vers les sites officiels des gouvernements fédéral et provinciaux. Ces
        pages sont mises à jour par les autorités compétentes. ComplyHub ne fournit pas de conseil
        juridique en immigration.
      </p>
    </div>
  )
}

function UpdateSection({ Icon, title, subtitle, items }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-steel" />
          <div className="text-[15px] font-bold">{title}</div>
        </div>
        {subtitle && <p className="text-[12px] text-[#7A8FA0] mt-1 ml-[30px]">{subtitle}</p>}
      </div>
      <div>
        {items.length === 0 ? (
          <div className="px-5 py-4 text-[13px] text-[#7A8FA0]">
            Aucun lien disponible pour cette juridiction.
          </div>
        ) : (
          items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 px-5 py-3.5 border-b border-mist last:border-0 hover:bg-paper transition group"
            >
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-ink group-hover:text-steel transition">
                  {item.topic}
                </div>
                <div className="text-[12px] text-[#5E7385] mt-0.5 leading-snug">{item.desc}</div>
              </div>
              <span className="badge flex-shrink-0">{item.source}</span>
              <ExternalLink
                size={16}
                className="text-[#9FB0BF] group-hover:text-steel transition flex-shrink-0"
              />
            </a>
          ))
        )}
      </div>
    </div>
  )
}
