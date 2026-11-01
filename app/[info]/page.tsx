import { notFound } from 'next/navigation';
import Link from 'next/link';
import { metadata } from '@/lib/seo/metadata';
import { site } from '@/lib/config';
const pages: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  about: {
    title: `About ${site.name}`,
    intro: 'A little direction for your first step into work.',
    sections: [
      [
        'Built for fresh beginnings',
        `${site.name} is an independent job discovery portal focused on desk and office opportunities for freshers and entry-level candidates across India. The site is maintained by the ${site.name} editorial team.`,
      ],
      [
        'How we review opportunities',
        'Before publication, an admin reviews eligibility, deadlines, the application source and the absence of recruitment fees. We link directly to employer or government application pages. Listings are summaries; the official notice is the final authority.',
      ],
      [
        'Our promise',
        'Browsing is free. No visitor account is needed. We never recruit on behalf of employers and never ask candidates for money. If something looks wrong, use the report link on that job.',
      ],
    ],
  },
  contact: {
    title: `Contact ${site.name}`,
    intro: 'Have a question, correction or concern? We’re listening.',
    sections: [
      [
        'Get in touch',
        'Contact the site operator at the email below. Include the job title and page link for corrections. Do not send identity documents, bank details or other sensitive information.',
      ],
      [
        'Report a listing',
        'Use “Report this job” on the listing to flag misleading information, an unsafe source or a request for fees. We review reports in the admin dashboard.',
      ],
    ],
  },
  'privacy-policy': {
    title: 'Privacy policy',
    intro: 'Browse opportunities with a clear understanding of your data.',
    sections: [
      [
        'Public visitors',
        'You do not need to create an account. Application click records contain only a job identifier and timestamp. Reports store the job identifier, your reason and the submission time. Do not include personal information in reports.',
      ],
      [
        'Poster accounts and security',
        'Approved staff accounts use Supabase email OTP authentication. Profiles store email, name, role and active status. Secure session cookies support login. We use temporary, hashed request identifiers to limit abuse; they are separate from click analytics.',
      ],
      [
        'Third parties and your choices',
        'Official application websites have their own privacy policies. Advertising and analytics are off unless the operator configures them. Before enabling personalized ads or analytics, the operator must add appropriate consent controls and update this policy. Contact the operator to request account or report removal.',
      ],
      [
        'Retention',
        'The operator should review and delete resolved reports, stale rate-limit records and unnecessary click records regularly. We do not sell application data.',
      ],
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    intro: 'We share opportunities. The official source has the final word.',
    sections: [
      [
        'We are not the employer',
        `${site.name} is an independent listing service. We do not offer employment, guarantee selection or accept applications on behalf of employers. Always verify details, eligibility and deadlines on the official company or government website.`,
      ],
      [
        'Never pay to apply through us',
        'We never charge candidates. Do not transfer money to recruiters, application agents or anyone promising selection. Report suspicious listings.',
      ],
      [
        'Accuracy and sample data',
        'We review listings but information may change. Fictional sample jobs are clearly marked and link to example.com; they are demonstrations, not active vacancies.',
      ],
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(pages).map((info) => ({ info }));
}
export async function generateMetadata({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  const p = pages[info];
  return p ? metadata(p.title, p.intro, `/${info}`) : {};
}
export default async function Info({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  const p = pages[info];
  if (!p) notFound();
  return (
    <div className="container section prose">
      <p className="eyebrow">THE PEOPLE BEHIND YOUR NEXT STEP</p>
      <h1>{p.title}</h1>
      <p className="lead">{p.intro}</p>
      {p.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
      {['about', 'contact', 'privacy-policy'].includes(info) && (
        <p>
          Contact: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          {!process.env.CONTACT_EMAIL && ' (placeholder — configure before launch)'}
        </p>
      )}
      <Link href="/jobs" className="button">
        Explore opportunities →
      </Link>
    </div>
  );
}
