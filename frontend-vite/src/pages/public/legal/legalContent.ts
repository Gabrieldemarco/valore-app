export interface LegalSectionContent {
  title: string;
  paragraphs: string[];
  lists?: string[][];
  email?: string;
}

export type LegalLanguage = 'es' | 'en' | 'pt';
export type LegalDocument = 'terms' | 'privacy' | 'cancellations';

export const legalContent: Record<LegalLanguage, Record<LegalDocument, LegalSectionContent[]>> = {
  es: {
    terms: [
      { title: '1. Introducción', paragraphs: [
        'Bienvenido a Velsoie. Al acceder y utilizar nuestra plataforma, sitio web o servicios relacionados, aceptás los presentes Términos y Condiciones.',
        'Velsoie es una plataforma digital destinada a conectar usuarios con salones, barberías, estudios de estética y profesionales del sector beauty y grooming en Uruguay.',
        'Si no estás de acuerdo con estos términos, te recomendamos no utilizar la plataforma.',
      ] },
      { title: '2. Uso de la plataforma', paragraphs: ['Velsoie permite a los usuarios:', 'El usuario se compromete a utilizar la plataforma de forma responsable, lícita y respetuosa.', 'No está permitido:'], lists: [
        ['descubrir salones y barberías,', 'reservar servicios,', 'gestionar citas,', 'acceder a información de profesionales y espacios adheridos.'],
        ['utilizar identidades falsas,', 'interferir con el funcionamiento de la plataforma,', 'intentar acceder sin autorización a cuentas o sistemas,', 'utilizar Velsoie con fines fraudulentos o ilegales.'],
      ] },
      { title: '3. Registro de cuentas', paragraphs: ['Para acceder a determinadas funcionalidades, puede ser necesario crear una cuenta.', 'El usuario es responsable de:', 'Velsoie podrá suspender o eliminar cuentas que incumplan estos términos.'], lists: [
        ['mantener la confidencialidad de sus credenciales,', 'proporcionar información veraz y actualizada,', 'todas las actividades realizadas desde su cuenta.'],
      ] },
      { title: '4. Reservas y cancelaciones', paragraphs: ['Las reservas realizadas mediante Velsoie quedan sujetas a disponibilidad de cada salón, barbería o profesional.', 'Cada establecimiento podrá definir:', 'Velsoie actúa como plataforma intermediaria y no garantiza la disponibilidad permanente de servicios.', 'Los usuarios deberán cancelar o modificar sus reservas con antelación razonable.', 'Las cancelaciones reiteradas o conductas abusivas podrán derivar en restricciones de uso.'], lists: [
        ['horarios,', 'condiciones de atención,', 'políticas de cancelación,', 'tiempos de tolerancia.'],
      ] },
      { title: '5. Responsabilidad de los establecimientos', paragraphs: ['Cada salón, barbería o profesional es responsable de:', 'Velsoie no presta directamente servicios de peluquería, barbería, estética o grooming.'], lists: [
        ['la calidad de sus servicios,', 'información publicada,', 'precios,', 'horarios,', 'condiciones de atención,', 'cumplimiento de normas aplicables.'],
      ] },
      { title: '6. Pagos', paragraphs: ['En caso de incorporarse funcionalidades de pago online, los usuarios aceptan que determinadas operaciones puedan ser procesadas mediante proveedores externos.', 'Velsoie no almacena información completa de tarjetas bancarias.', 'Los precios y condiciones serán definidos por cada establecimiento.'] },
      { title: '7. Propiedad intelectual', paragraphs: ['Todo el contenido de Velsoie, incluyendo:', 'se encuentra protegido por derechos de propiedad intelectual.', 'No está permitido copiar, reproducir o utilizar contenido sin autorización previa.'], lists: [
        ['marca,', 'diseño,', 'logotipos,', 'interfaz,', 'fotografías,', 'textos,', 'software,', 'identidad visual,'],
      ] },
      { title: '8. Limitación de responsabilidad', paragraphs: ['Velsoie realiza esfuerzos razonables para mantener la plataforma disponible y segura.', 'Sin embargo, no garantizamos:', 'Velsoie no será responsable por daños indirectos, pérdidas de datos o conflictos derivados entre usuarios y establecimientos.'], lists: [
        ['funcionamiento ininterrumpido,', 'ausencia total de errores,', 'disponibilidad permanente,', 'resultados específicos derivados del uso de la plataforma.'],
      ] },
      { title: '9. Suspensión o cancelación de acceso', paragraphs: ['Velsoie podrá suspender o cancelar cuentas cuando:'], lists: [
        ['exista incumplimiento de estos términos,', 'se detecte actividad sospechosa,', 'se afecte la seguridad de la plataforma,', 'exista conducta abusiva hacia otros usuarios o establecimientos.'],
      ] },
      { title: '10. Modificaciones', paragraphs: ['Velsoie podrá actualizar estos Términos y Condiciones en cualquier momento.', 'Las modificaciones entrarán en vigencia desde su publicación en la plataforma.'] },
      { title: '11. Legislación aplicable', paragraphs: ['Estos términos se rigen por las leyes de la República Oriental del Uruguay.'] },
      { title: '12. Contacto', paragraphs: ['Para consultas relacionadas con estos términos:'], email: 'contacto@velsoie.uy' },
    ],
    privacy: [
      { title: '1. Introducción', paragraphs: ['En Velsoie valoramos la privacidad y protección de los datos personales de nuestros usuarios.', 'La presente Política de Privacidad describe cómo recopilamos, utilizamos y protegemos la información.'] },
      { title: '2. Información que recopilamos', paragraphs: ['Podemos recopilar:'], lists: [
        ['nombre y apellido,', 'correo electrónico,', 'teléfono,', 'información de reservas,', 'ubicación aproximada,', 'datos de uso de la plataforma,', 'información técnica del dispositivo.'],
      ] },
      { title: '3. Uso de la información', paragraphs: ['Utilizamos la información para:'], lists: [
        ['gestionar reservas,', 'mejorar la experiencia de usuario,', 'brindar soporte,', 'enviar notificaciones relacionadas con servicios,', 'prevenir fraudes y usos indebidos,', 'optimizar la plataforma.'],
      ] },
      { title: '4. Compartición de datos', paragraphs: ['Velsoie podrá compartir información únicamente cuando sea necesario para:', 'No comercializamos información personal.'], lists: [
        ['gestionar reservas con establecimientos adheridos,', 'cumplir obligaciones legales,', 'proteger la seguridad de usuarios y plataforma,', 'operar servicios mediante proveedores tecnológicos.'],
      ] },
      { title: '5. Seguridad', paragraphs: ['Implementamos medidas razonables de seguridad para proteger la información.', 'Sin embargo, ningún sistema es completamente invulnerable.'] },
      { title: '6. Cookies y tecnologías similares', paragraphs: ['Velsoie puede utilizar cookies y herramientas de análisis para:', 'El usuario puede configurar su navegador para limitar o bloquear cookies.'], lists: [
        ['recordar preferencias,', 'mejorar funcionalidades,', 'analizar uso del sitio,', 'optimizar rendimiento.'],
      ] },
      { title: '7. Derechos del usuario', paragraphs: ['De acuerdo con la Ley N.º 18.331 de Protección de Datos Personales de Uruguay, los usuarios podrán:'], lists: [
        ['acceder a sus datos,', 'solicitar correcciones,', 'solicitar eliminación cuando corresponda,', 'revocar determinados consentimientos.'],
      ] },
      { title: '8. Conservación de datos', paragraphs: ['Los datos serán conservados durante el tiempo necesario para operar la plataforma y cumplir obligaciones legales.'] },
      { title: '9. Menores de edad', paragraphs: ['Velsoie no está dirigido a menores de 13 años sin autorización de sus representantes legales.'] },
      { title: '10. Cambios en esta política', paragraphs: ['Podremos actualizar esta Política de Privacidad periódicamente.', 'La versión vigente estará siempre disponible en la plataforma.'] },
      { title: '11. Contacto', paragraphs: ['Para consultas sobre privacidad o datos personales:'], email: 'privacidad@velsoie.uy' },
    ],
    cancellations: [
      { title: '1. Objetivo', paragraphs: ['La presente política busca promover una experiencia organizada y respetuosa para usuarios y establecimientos.'] },
      { title: '2. Cancelaciones', paragraphs: ['Los usuarios podrán cancelar o reprogramar reservas desde la plataforma.', 'Se recomienda realizar modificaciones con suficiente anticipación.', 'Cada establecimiento podrá establecer:'], lists: [
        ['tiempos mínimos de cancelación,', 'políticas específicas,', 'condiciones aplicables.'],
      ] },
      { title: '3. Inasistencias', paragraphs: ['Las inasistencias reiteradas o cancelaciones abusivas podrán derivar en:'], lists: [
        ['restricciones temporales,', 'limitaciones de reserva,', 'suspensión de funcionalidades.'],
      ] },
      { title: '4. Responsabilidad de los establecimientos', paragraphs: ['Los establecimientos son responsables de informar claramente:'], lists: [
        ['horarios,', 'políticas propias,', 'demoras,', 'reprogramaciones.'],
      ] },
      { title: '5. Modificaciones', paragraphs: ['Velsoie podrá actualizar esta política cuando sea necesario para mejorar la experiencia de la plataforma.'] },
      { title: '6. Contacto', paragraphs: [], email: 'soporte@velsoie.uy' },
    ],
  },
  en: {
    terms: [
      { title: '1. Introduction', paragraphs: [
        'Welcome to Velsoie. By accessing or using our platform, website, or related services, you agree to these Terms and Conditions.',
        'Velsoie is a digital platform that connects users with salons, barbershops, beauty studios, and beauty and grooming professionals in Uruguay.',
        'If you do not agree to these terms, we recommend that you do not use the platform.',
      ] },
      { title: '2. Use of the platform', paragraphs: ['Velsoie allows users to:', 'Users agree to use the platform responsibly, lawfully, and respectfully.', 'The following is prohibited:'], lists: [
        ['discover salons and barbershops,', 'book services,', 'manage appointments,', 'access information about participating professionals and businesses.'],
        ['use false identities,', 'interfere with the operation of the platform,', 'attempt to access accounts or systems without authorization,', 'use Velsoie for fraudulent or illegal purposes.'],
      ] },
      { title: '3. Account registration', paragraphs: ['Creating an account may be necessary to access certain features.', 'Users are responsible for:', 'Velsoie may suspend or delete accounts that violate these terms.'], lists: [
        ['keeping their credentials confidential,', 'providing accurate and up-to-date information,', 'all activity carried out through their account.'],
      ] },
      { title: '4. Bookings and cancellations', paragraphs: ['Bookings made through Velsoie are subject to availability at each salon, barbershop, or professional.', 'Each business may set its own:', 'Velsoie acts as an intermediary platform and does not guarantee the ongoing availability of services.', 'Users should cancel or change bookings with reasonable notice.', 'Repeated cancellations or abusive conduct may result in restrictions on use.'], lists: [
        ['hours,', 'service conditions,', 'cancellation policies,', 'grace periods.'],
      ] },
      { title: '5. Responsibility of businesses', paragraphs: ['Each salon, barbershop, or professional is responsible for:', 'Velsoie does not directly provide hairdressing, barbering, beauty, or grooming services.'], lists: [
        ['the quality of its services,', 'published information,', 'prices,', 'hours,', 'service conditions,', 'compliance with applicable rules.'],
      ] },
      { title: '6. Payments', paragraphs: ['If online payment features are introduced, users agree that certain transactions may be processed by external providers.', 'Velsoie does not store complete bank card information.', 'Each business sets its own prices and terms.'] },
      { title: '7. Intellectual property', paragraphs: ['All Velsoie content, including:', 'is protected by intellectual property rights.', 'Content may not be copied, reproduced, or used without prior authorization.'], lists: [
        ['the brand,', 'design,', 'logos,', 'interface,', 'photographs,', 'texts,', 'software,', 'visual identity,'],
      ] },
      { title: '8. Limitation of liability', paragraphs: ['Velsoie makes reasonable efforts to keep the platform available and secure.', 'However, we do not guarantee:', 'Velsoie is not responsible for indirect damages, data loss, or disputes between users and businesses.'], lists: [
        ['uninterrupted operation,', 'complete absence of errors,', 'continuous availability,', 'specific results from using the platform.'],
      ] },
      { title: '9. Suspension or termination of access', paragraphs: ['Velsoie may suspend or terminate accounts if:'], lists: [
        ['these terms are violated,', 'suspicious activity is detected,', 'platform security is affected,', 'abusive conduct toward other users or businesses occurs.'],
      ] },
      { title: '10. Changes', paragraphs: ['Velsoie may update these Terms and Conditions at any time.', 'Changes take effect when published on the platform.'] },
      { title: '11. Governing law', paragraphs: ['These terms are governed by the laws of the Oriental Republic of Uruguay.'] },
      { title: '12. Contact', paragraphs: ['For questions about these terms:'], email: 'contacto@velsoie.uy' },
    ],
    privacy: [
      { title: '1. Introduction', paragraphs: ['At Velsoie, we value the privacy and protection of our users’ personal data.', 'This Privacy Policy describes how we collect, use, and protect information.'] },
      { title: '2. Information we collect', paragraphs: ['We may collect:'], lists: [
        ['first and last name,', 'email address,', 'phone number,', 'booking information,', 'approximate location,', 'platform usage data,', 'technical information about the device.'],
      ] },
      { title: '3. How we use information', paragraphs: ['We use information to:'], lists: [
        ['manage bookings,', 'improve the user experience,', 'provide support,', 'send service-related notifications,', 'prevent fraud and misuse,', 'optimize the platform.'],
      ] },
      { title: '4. Sharing data', paragraphs: ['Velsoie may share information only when necessary to:', 'We do not sell personal information.'], lists: [
        ['manage bookings with participating businesses,', 'meet legal obligations,', 'protect the security of users and the platform,', 'operate services through technology providers.'],
      ] },
      { title: '5. Security', paragraphs: ['We implement reasonable security measures to protect information.', 'However, no system is completely invulnerable.'] },
      { title: '6. Cookies and similar technologies', paragraphs: ['Velsoie may use cookies and analytics tools to:', 'Users can configure their browsers to limit or block cookies.'], lists: [
        ['remember preferences,', 'improve features,', 'analyze site usage,', 'optimize performance.'],
      ] },
      { title: '7. User rights', paragraphs: ['Under Uruguay’s Personal Data Protection Act No. 18,331, users may:'], lists: [
        ['access their data,', 'request corrections,', 'request deletion where applicable,', 'withdraw certain consents.'],
      ] },
      { title: '8. Data retention', paragraphs: ['Data will be retained for as long as necessary to operate the platform and meet legal obligations.'] },
      { title: '9. Minors', paragraphs: ['Velsoie is not intended for children under 13 without authorization from their legal representatives.'] },
      { title: '10. Changes to this policy', paragraphs: ['We may update this Privacy Policy periodically.', 'The current version will always be available on the platform.'] },
      { title: '11. Contact', paragraphs: ['For questions about privacy or personal data:'], email: 'privacidad@velsoie.uy' },
    ],
    cancellations: [
      { title: '1. Purpose', paragraphs: ['This policy aims to promote an organized and respectful experience for users and businesses.'] },
      { title: '2. Cancellations', paragraphs: ['Users may cancel or reschedule bookings through the platform.', 'We recommend making changes with sufficient notice.', 'Each business may establish:'], lists: [
        ['minimum cancellation notice,', 'specific policies,', 'applicable conditions.'],
      ] },
      { title: '3. No-shows', paragraphs: ['Repeated no-shows or abusive cancellations may result in:'], lists: [
        ['temporary restrictions,', 'booking limitations,', 'suspension of features.'],
      ] },
      { title: '4. Responsibility of businesses', paragraphs: ['Businesses are responsible for clearly communicating:'], lists: [
        ['hours,', 'their own policies,', 'delays,', 'rescheduling.'],
      ] },
      { title: '5. Changes', paragraphs: ['Velsoie may update this policy when necessary to improve the platform experience.'] },
      { title: '6. Contact', paragraphs: [], email: 'soporte@velsoie.uy' },
    ],
  },
  pt: {
    terms: [
      { title: '1. Introdução', paragraphs: [
        'Bem-vindo à Velsoie. Ao acessar ou usar nossa plataforma, site ou serviços relacionados, você concorda com estes Termos e Condições.',
        'A Velsoie é uma plataforma digital que conecta usuários a salões, barbearias, estúdios de beleza e profissionais de beleza e grooming no Uruguai.',
        'Se você não concordar com estes termos, recomendamos que não use a plataforma.',
      ] },
      { title: '2. Uso da plataforma', paragraphs: ['A Velsoie permite que os usuários:', 'Os usuários concordam em utilizar a plataforma de forma responsável, legal e respeitosa.', 'Não é permitido:'], lists: [
        ['encontrar salões e barbearias,', 'agendar serviços,', 'gerenciar horários,', 'acessar informações sobre profissionais e estabelecimentos participantes.'],
        ['usar identidades falsas,', 'interferir no funcionamento da plataforma,', 'tentar acessar contas ou sistemas sem autorização,', 'usar a Velsoie para fins fraudulentos ou ilegais.'],
      ] },
      { title: '3. Cadastro de conta', paragraphs: ['Pode ser necessário criar uma conta para acessar determinados recursos.', 'Os usuários são responsáveis por:', 'A Velsoie poderá suspender ou excluir contas que violem estes termos.'], lists: [
        ['manter suas credenciais confidenciais,', 'fornecer informações verdadeiras e atualizadas,', 'todas as atividades realizadas em sua conta.'],
      ] },
      { title: '4. Agendamentos e cancelamentos', paragraphs: ['Os agendamentos feitos pela Velsoie estão sujeitos à disponibilidade de cada salão, barbearia ou profissional.', 'Cada estabelecimento poderá definir:', 'A Velsoie atua como plataforma intermediária e não garante a disponibilidade permanente dos serviços.', 'Os usuários devem cancelar ou alterar seus agendamentos com antecedência razoável.', 'Cancelamentos frequentes ou condutas abusivas podem resultar em restrições de uso.'], lists: [
        ['horários,', 'condições de atendimento,', 'políticas de cancelamento,', 'períodos de tolerância.'],
      ] },
      { title: '5. Responsabilidade dos estabelecimentos', paragraphs: ['Cada salão, barbearia ou profissional é responsável por:', 'A Velsoie não presta diretamente serviços de cabeleireiro, barbearia, estética ou grooming.'], lists: [
        ['a qualidade de seus serviços,', 'as informações publicadas,', 'preços,', 'horários,', 'condições de atendimento,', 'o cumprimento das normas aplicáveis.'],
      ] },
      { title: '6. Pagamentos', paragraphs: ['Se forem disponibilizados recursos de pagamento online, os usuários concordam que determinadas operações poderão ser processadas por provedores externos.', 'A Velsoie não armazena informações completas de cartões bancários.', 'Os preços e as condições são definidos por cada estabelecimento.'] },
      { title: '7. Propriedade intelectual', paragraphs: ['Todo o conteúdo da Velsoie, incluindo:', 'é protegido por direitos de propriedade intelectual.', 'Não é permitido copiar, reproduzir ou usar conteúdo sem autorização prévia.'], lists: [
        ['marca,', 'design,', 'logotipos,', 'interface,', 'fotografias,', 'textos,', 'software,', 'identidade visual,'],
      ] },
      { title: '8. Limitação de responsabilidade', paragraphs: ['A Velsoie faz esforços razoáveis para manter a plataforma disponível e segura.', 'No entanto, não garantimos:', 'A Velsoie não será responsável por danos indiretos, perda de dados ou conflitos entre usuários e estabelecimentos.'], lists: [
        ['funcionamento ininterrupto,', 'ausência total de erros,', 'disponibilidade permanente,', 'resultados específicos decorrentes do uso da plataforma.'],
      ] },
      { title: '9. Suspensão ou cancelamento de acesso', paragraphs: ['A Velsoie poderá suspender ou cancelar contas quando:'], lists: [
        ['estes termos forem violados,', 'for detectada atividade suspeita,', 'a segurança da plataforma for afetada,', 'houver conduta abusiva contra outros usuários ou estabelecimentos.'],
      ] },
      { title: '10. Alterações', paragraphs: ['A Velsoie poderá atualizar estes Termos e Condições a qualquer momento.', 'As alterações entram em vigor quando forem publicadas na plataforma.'] },
      { title: '11. Legislação aplicável', paragraphs: ['Estes termos são regidos pelas leis da República Oriental do Uruguai.'] },
      { title: '12. Contato', paragraphs: ['Para dúvidas relacionadas a estes termos:'], email: 'contacto@velsoie.uy' },
    ],
    privacy: [
      { title: '1. Introdução', paragraphs: ['Na Velsoie, valorizamos a privacidade e a proteção dos dados pessoais dos nossos usuários.', 'Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações.'] },
      { title: '2. Informações que coletamos', paragraphs: ['Podemos coletar:'], lists: [
        ['nome e sobrenome,', 'endereço de email,', 'telefone,', 'informações de agendamentos,', 'localização aproximada,', 'dados de uso da plataforma,', 'informações técnicas do dispositivo.'],
      ] },
      { title: '3. Uso das informações', paragraphs: ['Usamos as informações para:'], lists: [
        ['gerenciar agendamentos,', 'melhorar a experiência do usuário,', 'oferecer suporte,', 'enviar notificações relacionadas aos serviços,', 'prevenir fraudes e usos indevidos,', 'otimizar a plataforma.'],
      ] },
      { title: '4. Compartilhamento de dados', paragraphs: ['A Velsoie poderá compartilhar informações somente quando necessário para:', 'Não comercializamos informações pessoais.'], lists: [
        ['gerenciar agendamentos com estabelecimentos participantes,', 'cumprir obrigações legais,', 'proteger a segurança dos usuários e da plataforma,', 'operar serviços por meio de provedores de tecnologia.'],
      ] },
      { title: '5. Segurança', paragraphs: ['Implementamos medidas razoáveis de segurança para proteger as informações.', 'No entanto, nenhum sistema é completamente invulnerável.'] },
      { title: '6. Cookies e tecnologias semelhantes', paragraphs: ['A Velsoie pode usar cookies e ferramentas de análise para:', 'O usuário pode configurar o navegador para limitar ou bloquear cookies.'], lists: [
        ['lembrar preferências,', 'melhorar recursos,', 'analisar o uso do site,', 'otimizar o desempenho.'],
      ] },
      { title: '7. Direitos do usuário', paragraphs: ['De acordo com a Lei nº 18.331 de Proteção de Dados Pessoais do Uruguai, os usuários podem:'], lists: [
        ['acessar seus dados,', 'solicitar correções,', 'solicitar a exclusão quando aplicável,', 'revogar determinados consentimentos.'],
      ] },
      { title: '8. Retenção de dados', paragraphs: ['Os dados serão mantidos pelo tempo necessário para operar a plataforma e cumprir obrigações legais.'] },
      { title: '9. Menores de idade', paragraphs: ['A Velsoie não se destina a menores de 13 anos sem autorização de seus representantes legais.'] },
      { title: '10. Alterações nesta política', paragraphs: ['Poderemos atualizar esta Política de Privacidade periodicamente.', 'A versão vigente estará sempre disponível na plataforma.'] },
      { title: '11. Contato', paragraphs: ['Para dúvidas sobre privacidade ou dados pessoais:'], email: 'privacidad@velsoie.uy' },
    ],
    cancellations: [
      { title: '1. Objetivo', paragraphs: ['Esta política busca promover uma experiência organizada e respeitosa para usuários e estabelecimentos.'] },
      { title: '2. Cancelamentos', paragraphs: ['Os usuários podem cancelar ou reagendar reservas pela plataforma.', 'Recomendamos fazer alterações com antecedência suficiente.', 'Cada estabelecimento poderá definir:'], lists: [
        ['prazos mínimos para cancelamento,', 'políticas específicas,', 'condições aplicáveis.'],
      ] },
      { title: '3. Não comparecimento', paragraphs: ['Faltas frequentes ou cancelamentos abusivos podem resultar em:'], lists: [
        ['restrições temporárias,', 'limitações de agendamento,', 'suspensão de funcionalidades.'],
      ] },
      { title: '4. Responsabilidade dos estabelecimentos', paragraphs: ['Os estabelecimentos são responsáveis por informar claramente:'], lists: [
        ['horários,', 'políticas próprias,', 'atrasos,', 'reagendamentos.'],
      ] },
      { title: '5. Alterações', paragraphs: ['A Velsoie poderá atualizar esta política quando necessário para melhorar a experiência na plataforma.'] },
      { title: '6. Contato', paragraphs: [], email: 'soporte@velsoie.uy' },
    ],
  },
};
