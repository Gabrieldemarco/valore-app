import React from 'react';
import type { ContactBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Button, Grid } from './common';

/* ============================================================
   Contact Block
   ============================================================ */

export function ContactBlockRenderer({ 
  block, 
  context, 
}: { 
  block: ContactBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    subtitle, 
    address, 
    phone, 
    email, 
    whatsapp, 
    instagram, 
    facebook, 
  } = block;

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, send to API
    console.log('Contact form submitted:', formData);
    alert('¡Gracias por tu mensaje! Te responderemos pronto.');
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="contact" className="ws-contact">
        <Container>
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && <Heading level={2} className="mb-4">{title}</Heading>}
              {subtitle && <Text size="lg" className="max-w-2xl mx-auto">{subtitle}</Text>}
            </div>
          )}

          <Grid columns={1} className="lg:grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Contact Info */}
            <div className="space-y-8">
              {address && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--ws-primary)]/20 flex items-center justify-center text-[var(--ws-primary)] flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-medium text-[var(--ws-primary)] mb-1">Dirección</h4>
                    <p className="text-white/60">{address}</p>
                  </div>
                </div>
              )}
              
              {phone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--ws-primary)]/20 flex items-center justify-center text-[var(--ws-primary)] flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 2.257a1 1 0 01-.707 0L7.203 16.5a1 1 0 01-1.21.502l-4.493 1.498a1 1 0 01-1.21-.502L1.5 13.5a1 1 0 01-.502-1.21L1 12.5a1 1 0 01.502-1.21L4.5 9.5a1 1 0 01.707 0L9.5 12a1 1 0 01.707.707l2.257 2.257a1 1 0 010 1.414l-1.498 4.493a1 1 0 01-.502 1.21L7.203 21a1 1 0 01-1.21.502l-4.493-1.498a1 1 0 01-1.21-.502L3 16.5a1 1 0 01-.502-1.21L2.5 15a1 1 0 01.502-1.21l4.493-1.498a1 1 0 01.707 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-medium text-[var(--ws-primary)] mb-1">Teléfono</h4>
                    <a href={`tel:${phone}`} className="text-white/60 hover:text-[var(--ws-primary)] transition-colors">{phone}</a>
                  </div>
                </div>
              )}
              
              {email && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--ws-primary)]/20 flex items-center justify-center text-[var(--ws-primary)] flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-medium text-[var(--ws-primary)] mb-1">Email</h4>
                    <a href={`mailto:${email}`} className="text-white/60 hover:text-[var(--ws-primary)] transition-colors">{email}</a>
                  </div>
                </div>
              )}
              
              {whatsapp && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.48-1.653-1.653-.173-.172-.347-.223-.644-.074-.297.15-1.02.766-1.163.94-.149.198-.198.397-.075.644.787.882 1.97 1.852 2.16 1.992.12.09.21.24.1.21l-.35.12c-1.57.229-2.594.195-3.39.099a36.106 36.106 0 01-1.553-.317l-.648-.348c-.259-.124-.392-.246-.475-.369-.083-.123-.258-.525-.145-.778.113-.252.368-.592.51-.794.14-.2.336-.448.585-.64.134-.1.34-.217.563-.245.223-.028.493-.053.703.027.21.08 1.07.798 1.07 1.07 1.79 1.146 2.192 1.956 3.023 3.22.21.29.847.814 1.136.814.234 0 .53-.16.75-.32.19-.13.4-.26.55-.35.22-.15.39-.27.5-.35.21-.15.4-.25.46-.33.07-.06.19-.13 1.14-.56.73-.38 1.33-.69 1.78-1.04.55-.42 1.02-.93 1.45-1.54.25-.37.46-.75.62-1.05.07-.14.12-.29.09-.43-.23-.54-1.07-.93-1.64-1.1-1.07-.32-2.04-.48-3-.48-.26 0-.5-.02-.74-.04a15.828 15.828 0 01-.65-.06c-.33-.03-.65-.07-.96-.13a16.89 16.89 0 01-1.15-.32c-.13-.04-.26-.09-.39-.13-.5-.17-.96-.4-1.37-.64-.02-.01-.03-.01-.05-.02-.02-.01-.03-.01-.05-.02-.02-.01-.03-.01-.05-.01a21.1 21.1 0 00-.9.875c-.09.12-.248.34-.248.51 0 .24.202.56.248.56.09 0 .249-.057.52-.11.14-.026.49-.114 1.274-.54.56-.82 2.568-1.434 2.894-1.61.37-.19.81-.43 1.05-.583.32-.2.52-.44.6-.54.25-.17.42-.34.46-.38.07-.07.19-.144.29-.144.247 0 .777.216 1.4.72.42.34.96.85 1.26 1.26a4.5 4.5 0 010 2.76c0 .37-.07.72-.16 1.07-.06.2-.12.37-.12.56 0 .21.16.46.38.46.26 0 .5-.1.7-.26.1-.1.2-.17.35-.24.14-.07.2-.14.34-.14.297 0 .877.46 1.27 1.2.16.29.25.61.25.9 0 .48-.37.88-.82 1.07-.58.23-1.06.39-1.6.39-.56 0-1.02-.12-1.42-.3-.38-.18-.7-.37-.95-.53-.2-.13-.37-.25-.52-.34-.22-.15-.4-.26-.5-.34-.08-.07-.12-.15-.18-.24-.07-.09-.09-.19-.09-.28 0-.1.12-.16.18-.24.18-.19.8-1.35.8-2.75 0-1.4-.85-2.44-2.03-3.22-.18-.12-.42-.18-.62-.22z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-medium text-[var(--ws-primary)] mb-1">WhatsApp</h4>
                    <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-green-500 transition-colors">{whatsapp}</a>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(instagram || facebook) && (
              <div className="flex gap-4 pt-4 border-t border-white/10">
                {instagram && (
                  <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-7.083 7.083-.058 1.281-.072 1.689-.072 4.947 0 3.259.014 3.667.072 4.947.2 4.358 2.618 6.78 7.083 7.083.058 1.281.072 1.689.072 4.947 0 3.259-.014 3.667-.072 4.947-.2 4.358-2.618 6.78-7.083 7.083-.058 1.281-.072 1.69-.072 4.947 0 3.26-.013 3.584-.072 4.849-.15 3.227-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/></svg>
                  </a>
                )}
                {facebook && (
                  <a href={`https://facebook.com/${facebook}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.046V9.43c0-3.007 1.792-4.667 4.533-4.667 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.058 24 12.073z"/></svg>
                  </a>
                )}
              </div>
            )}

            {/* Contact Form */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[var(--ws-radius-lg)] p-8">
              <Heading level={3} className="mb-6" align="left">Envíanos un mensaje</Heading>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[var(--ws-primary)] mb-2">Nombre *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[var(--ws-radius)] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent transition-all"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[var(--ws-primary)] mb-2">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[var(--ws-radius)] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--ws-primary)] mb-2">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[var(--ws-radius)] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent transition-all"
                    placeholder="+598 99 000 000"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[var(--ws-primary)] mb-2">Mensaje *</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[var(--ws-radius)] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary)] focus:border-transparent transition-all resize-none"
                    placeholder="Cuéntanos qué necesitas..."
                  />
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  Enviar mensaje
                </Button>
              </form>
            </div>
          </Grid>
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('contact', ContactBlockRenderer as unknown as BlockRenderer);