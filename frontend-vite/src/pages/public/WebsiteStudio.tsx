import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import WebsiteRenderer from '../../features/website-studio/WebsiteRenderer';
import type { SiteConfig } from '../../features/website-studio/lib/templateEngine';
import WebsiteStudioLoading from './WebsiteStudioLoading';
import WebsiteStudioError from './WebsiteStudioError';

interface TenantInfo {
  id: number;
  slug: string;
  businessName: string;
  logo?: string;
  services: Array<{ id: number; name: string; price: number; duration: number; image?: string; category?: string }>;
  staff: Array<{ id: number; name: string; photo?: string; specialties?: string }>;
  address?: string;
  phone?: string;
  email?: string;
}

export default function WebsiteStudio() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    api.get<{ config: SiteConfig; tenant: TenantInfo }>(`/p/${slug}/website`)
      .then(data => {
        setConfig(data.config);
        setTenant(data.tenant);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        if (err.message === 'Not Found') {
          setError('El sitio web no está disponible');
        } else {
          setError(err.message || 'Error al cargar el sitio web');
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <WebsiteStudioLoading />;
  if (error) return <WebsiteStudioError message={error} />;
  if (!config || !tenant) return <WebsiteStudioError message="Configuración no encontrada" />;

  return (
    <WebsiteRenderer
      config={config}
      tenant={{
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
        logo: tenant.logo,
        services: tenant.services || [],
        staff: tenant.staff || [],
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
      }}
    />
  );
}
