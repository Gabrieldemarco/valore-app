const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

interface TeamItem {
  name: string;
  specialties?: string[];
  role?: string;
  bio?: string | null;
  photo_url?: string | null;
  photo?: string;
}

interface StaffMember {
  id: number;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
}

interface LandingTeamSectionProps {
  team: TeamItem[];
  staff: StaffMember[];
  gallery: string[];
  fixImageUrl: (url: string | null | undefined) => string;
  onSelectStaff: (id: number) => void;
  onOpenLightbox: (idx: number) => void;
}

export default function LandingTeamSection({
  team,
  staff,
  gallery,
  fixImageUrl,
  onSelectStaff,
  onOpenLightbox,
}: LandingTeamSectionProps) {
  return (
    <>
      {gallery.length > 0 && (
        <section id="galeria">
          <h2 className="section-title">Galería</h2>
          <p className="section-subtitle">Conocé nuestro trabajo</p>
          <div className="gallery-grid">
            {gallery.map((g, i) => (
              <div key={i} className="gallery-item" onClick={() => onOpenLightbox(i)}>
                <img
                  src={fixImageUrl(g)}
                  alt=""
                  onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {team.length > 0 && (
        <section id="equipo">
          <h2 className="section-title">Nuestro Equipo</h2>
          <p className="section-subtitle">Conocé a los profesionales</p>
          <div className="team-grid">
            {team.map((m, i) => {
              const staffMember = staff.find(s => s.name === m.name);
              const staffId = staffMember?.id || (m as StaffMember & { id?: number }).id;
              return (
                <div
                  key={i}
                  className="team-card"
                  style={staffId ? { cursor: 'pointer' } : undefined}
                  onClick={() => {
                    if (staffId) onSelectStaff(staffId);
                  }}
                >
                  {(m.photo_url || m.photo) && (
                    <img
                      src={fixImageUrl(m.photo_url || m.photo || '')}
                      alt={m.name}
                      className="team-photo"
                      onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                      loading="lazy"
                    />
                  )}
                  <h3 className="team-name">{m.name}</h3>
                  {(m.specialties?.join(', ') || m.role) && (
                    <p className="team-role">{m.specialties?.join(', ') || m.role}</p>
                  )}
                  {m.bio && <p className="team-bio">{m.bio}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
