export type LegalId = "privacy" | "terms" | "disclaimer" | "contact";
export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  after?: string[];
};
export type LegalDocument = {
  label: string;
  title: string;
  introduction: string[];
  sections: LegalSection[];
};
export const LEGAL_UPDATED = "October 8, 2026";
export const legalDocuments: Record<LegalId, LegalDocument> = {
  privacy: {
    label: "Privacy Policy",
    title: "PropertyIQ — Privacy Policy",
    introduction: [
      'PropertyIQ ("PropertyIQ," "we," "us," or "our") is an independent real estate investment analysis website operated by Lewis Adkins.',
      "We recognize the importance of protecting user information and providing transparency about how information is collected, used, processed, and shared. This Privacy Policy describes the information practices of the current browser-local version of PropertyIQ.",
    ],
    sections: [
      {
        title: "1. Information We Process",
        paragraphs: [
          "The current app processes information you enter or select in your browser. This may include:",
        ],
        bullets: [
          "Property addresses, descriptions, and characteristics.",
          "Rental income, operating expenses, and financial assumptions.",
          "Purchase prices, financing details, and investment projections.",
          "Financial statements, rent rolls, spreadsheets, and other documents selected for supported import or local attachment features.",
          "Questions, property descriptions, project notes, and requests entered into the tools.",
        ],
        after: [
          "The current app has no contact-submission form, user accounts, advertising, or analytics tracking. If hosted online, the hosting provider may receive ordinary website requests, which can include IP addresses, browser/device information, and technical request logs. These requests are separate from the financial information and documents processed locally by the app.",
          "Avoid submitting Social Security numbers, bank account credentials, payment card information, or unnecessary personal information about tenants or other individuals.",
        ],
      },
      {
        title: "2. How We Use Information",
        paragraphs: [
          "Information is processed locally for purposes including:",
        ],
        bullets: [
          "Generating property financial analyses and calculating investment metrics and projections.",
          "Reading supported spreadsheet values and preparing local reports.",
          "Saving and restoring analyses, revisions, and supporting documents in this browser.",
          "Operating the website and identifying input or calculation errors.",
        ],
        after: [
          "If you contact the operator through a contact method added in the future, voluntarily provided information may be used to respond to your inquiry and meet applicable legal obligations. Contact details are currently pending.",
        ],
      },
      {
        title: "3. Browser-Local Processing and Artificial Intelligence",
        paragraphs: [
          "Calculations, spreadsheet parsing, and description-based setup run in your browser. The setup tool extracts supported numbers using local rules; it does not send prompts to an AI service.",
          "The current app has no AI API integration and does not upload your financial assumptions or selected documents to an AI provider or PropertyIQ server. AI may have assisted in developing the software; this does not mean your property data is processed by an AI service.",
          "If remote processing or AI features are introduced, this policy will be updated to describe the applicable data practices before those features process user information.",
        ],
      },
      {
        title: "4. Information Sharing and Third-Party Services",
        paragraphs: [
          "The current app does not sell locally entered information, share it for targeted advertising, or transmit your analyses and documents to third-party processing services.",
          "Hosting providers may handle ordinary website requests. External links take you to websites with their own privacy practices. Files you export or share yourself are handled by the recipients or services you choose.",
          "Local libraries used for calculation and file parsing are not remote data-processing services. Future integrations, if introduced, will be described in an updated policy.",
        ],
      },
      {
        title: "5. Local Storage and Retention",
        paragraphs: [
          "Saved analyses and workspace history use browser local storage. Supporting files attached to monthly projects use the browser's IndexedDB storage. Some unsaved inputs remain only in memory. Storage is specific to the browser profile and website address you use; it does not synchronize across devices or accounts.",
          "Saved information remains locally until it is removed, replaced, or cleared by you or the browser. Browser storage limits, private browsing, clearing site data, or device loss can remove saved work. PropertyIQ does not provide a server-side copy or automatic cloud backup.",
        ],
      },
      {
        title: "6. Your Controls and Backups",
        paragraphs: [
          "You choose which files to select and which analyses to save or export. Export a backup when you need a copy outside browser storage. Backups and exported reports may contain financial information and attached source documents; store and share them carefully.",
          "To remove all locally saved PropertyIQ data, clear this site's data in your browser settings, including local storage and IndexedDB. This also removes saved analyses and local attachments. Export needed work first. Clearing site data does not delete files already downloaded or shared elsewhere.",
          "The operator cannot retrieve or remotely delete information that exists only in your browser or on your computer. You control those local copies.",
        ],
      },
      {
        title: "7. Data Security",
        paragraphs: [
          "PropertyIQ limits remote exposure by processing analyses and documents locally. Browser storage and exported files depend on the security of your device and browser profile; the app does not provide an additional encrypted vault for these files.",
          "No internet-based service or electronic storage system can guarantee complete security. Avoid unnecessary sensitive information and protect access to your device, browser profile, and backups.",
        ],
      },
      {
        title: "8. Cookies and Website Analytics",
        paragraphs: [
          "The current app does not set tracking cookies or include advertising or analytics scripts. Browser local storage and IndexedDB support saving work as described above.",
          "An online hosting provider may use technologies needed to deliver or secure the website. If additional cookies, tracking, analytics, or advertising services are introduced, the policy will be updated and applicable disclosures, consent mechanisms, or opt-out choices will be provided where required by law.",
        ],
      },
      {
        title: "9. User Privacy Rights",
        paragraphs: [
          "Depending on applicable law and your location, you may have rights to:",
        ],
        bullets: [
          "Request access to certain personal information.",
          "Request correction of inaccurate information.",
          "Request deletion of eligible personal information.",
          "Request information about how personal data is processed.",
          "Opt out of certain forms of information sharing or processing.",
        ],
        after: [
          "For local-only information, use the browser controls described in section 6. A public contact method for the operator is pending; the Contact page will be updated when one is available. No privacy-request submission channel is currently provided by this website. Applicable requests received by the operator will be addressed in accordance with legal requirements.",
        ],
      },
      {
        title: "10. Children's Privacy",
        paragraphs: [
          "PropertyIQ is intended for adults aged 18 and older. It is not directed toward children under 13, and we do not knowingly solicit personal information from children under 13.",
          "If we become aware of information collected from a child in circumstances requiring deletion, we will take appropriate action with respect to information within our control.",
        ],
      },
      {
        title: "11. International Users",
        paragraphs: [
          "PropertyIQ is operated from the United States. In the current app, analyses and documents are processed on your device, wherever you use it.",
          "For an online deployment, ordinary website request information may be processed where the hosting provider operates. If future services transfer personal information internationally, their practices and applicable safeguards will be described in an updated policy.",
        ],
      },
      {
        title: "12. Changes to This Privacy Policy",
        paragraphs: [
          "PropertyIQ may update this Privacy Policy to reflect changes in functionality, technology providers, data practices, or legal obligations. Revised versions will be published with an updated revision date. Where required by applicable law, additional notice will be provided.",
        ],
      },
    ],
  },
  terms: {
    label: "Terms of Service",
    title: "PropertyIQ — Terms of Service",
    introduction: [
      "Welcome to PropertyIQ. These Terms of Service govern your access to and use of the PropertyIQ website, software, analytical tools, and related services.",
      'PropertyIQ is operated by Lewis Adkins ("PropertyIQ," "we," "us," or "our").',
      "By using PropertyIQ, you agree to these Terms. If you do not agree, please discontinue use of the platform.",
    ],
    sections: [
      {
        title: "1. Description of Services",
        paragraphs: [
          "PropertyIQ provides software tools designed to assist users with real estate financial analysis, property evaluation, and investment research.",
          "Features may include rental property analysis, cash flow calculations, net operating income estimates, capitalization rates, financing scenarios, financial projections, spreadsheet import, and analytical reports. Features and functionality may change over time.",
        ],
      },
      {
        title: "2. Informational Purposes Only",
        paragraphs: [
          "All information provided through PropertyIQ is intended for general informational and educational purposes. PropertyIQ does not provide personalized financial, investment, legal, accounting, tax, or professional real estate appraisal advice.",
          "Users should independently verify all calculations, financial assumptions, property information, and projections before making decisions.",
        ],
      },
      {
        title: "3. Automated Analysis and AI-Generated Content",
        paragraphs: [
          "The current app uses local calculations and rule-based description parsing. It does not use an AI API to process your information or generate analytical results.",
          "If AI features are introduced in the future, AI-generated content may contain inaccuracies, omissions, outdated information, or incorrect assumptions. PropertyIQ does not guarantee the accuracy, completeness, or reliability of such content.",
          "Automated calculations can also contain errors or depend on unsuitable assumptions. Users remain responsible for reviewing and verifying outputs before relying on them.",
        ],
      },
      {
        title: "4. User-Provided Information",
        paragraphs: [
          "Users are responsible for ensuring the accuracy and legality of information entered or uploaded to PropertyIQ. By submitting information or documents, you represent that you have the necessary rights and permissions to provide them.",
          "You grant PropertyIQ a limited, nonexclusive license to process submitted content for the purpose of providing the requested services and operating the platform in accordance with our Privacy Policy. In the current version, this processing occurs locally in your browser.",
          "Users should not submit Social Security numbers, banking credentials, or other highly sensitive personal information.",
        ],
      },
      {
        title: "5. Acceptable Use",
        paragraphs: ["You agree not to:"],
        bullets: [
          "Use PropertyIQ for fraudulent, unlawful, or discriminatory purposes.",
          "Upload malicious software or content that violates the rights of others.",
          "Attempt unauthorized access to the platform or its systems.",
          "Interfere with the functionality or security of the service.",
          "Misrepresent automatically generated information as independently verified professional analysis.",
        ],
      },
      {
        title: "6. Intellectual Property",
        paragraphs: [
          "The PropertyIQ name, branding, website design, original software, and related materials are owned by PropertyIQ or its applicable licensors.",
          "You may use the platform for lawful personal or business analysis, but you may not reproduce, distribute, or commercially exploit proprietary platform materials without authorization. This restriction does not limit rights granted under applicable third-party or open-source licenses.",
          "You retain ownership of the original information and documents you upload.",
        ],
      },
      {
        title: "7. Third-Party Services",
        paragraphs: [
          "PropertyIQ may rely on third-party providers for hosting or other functionality. The current app processes financial inputs and documents locally and does not use remote AI or analytics services.",
          "Third-party services and external websites may be subject to their own terms and privacy practices. Additional integrations, if introduced, will be described in the applicable disclosures.",
        ],
      },
      {
        title: "8. Availability",
        paragraphs: [
          "PropertyIQ may modify, suspend, or discontinue features at any time. We do not guarantee uninterrupted access, continuous availability, or error-free operation.",
          "Local browser storage is not a guaranteed backup. You are responsible for exporting and protecting copies of work you wish to retain.",
        ],
      },
      {
        title: "9. Disclaimer of Warranties",
        paragraphs: [
          'To the extent permitted by applicable law, PropertyIQ is provided on an "as is" and "as available" basis, without warranties of any kind, whether express or implied.',
          "We do not warrant that analytical outputs, calculations, forecasts, or other platform information will be accurate, complete, or suitable for a particular purpose. Nothing in these Terms excludes warranties or rights that cannot lawfully be excluded.",
        ],
      },
      {
        title: "10. Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by applicable law, PropertyIQ and its operators shall not be liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of the platform.",
          "Nothing in these Terms excludes liability that cannot legally be limited or excluded.",
        ],
      },
      {
        title: "11. Changes to These Terms",
        paragraphs: [
          "We may update these Terms periodically. Updated versions will be published on this website with a revised effective date. Continued use following changes constitutes acceptance of the updated Terms to the extent permitted by law.",
        ],
      },
      {
        title: "12. Governing Law",
        paragraphs: [
          "These Terms are governed by the laws of Missouri, United States, except where applicable law requires otherwise.",
        ],
      },
    ],
  },
  disclaimer: {
    label: "Financial Disclaimer",
    title: "PropertyIQ — Financial & AI Disclaimer",
    introduction: [
      "PropertyIQ is an independent real estate analysis software platform designed to assist users with evaluating investment properties and understanding financial information.",
    ],
    sections: [
      {
        title: "Not Financial or Investment Advice",
        paragraphs: [
          "All analyses, projections, estimates, and recommendations generated through PropertyIQ are provided for informational and educational purposes only.",
          "Nothing on this platform constitutes personalized financial, investment, legal, tax, accounting, or professional real estate advice. PropertyIQ does not provide certified real estate appraisals.",
        ],
      },
      {
        title: "Financial Estimates and Projections",
        paragraphs: ["PropertyIQ may calculate or estimate:"],
        bullets: [
          "Net operating income (NOI).",
          "Capitalization rates.",
          "Cash flow and cash-on-cash returns.",
          "Debt service and debt service coverage ratios.",
          "Property valuations.",
          "Operating expenses and rental revenue.",
          "Financing scenarios.",
          "Potential investment returns.",
        ],
        after: [
          "These calculations depend on user-provided information, selected assumptions, and available data.",
          "Actual results may differ materially from projections due to market changes, vacancies, financing costs, taxes, maintenance expenses, operating conditions, and other factors.",
        ],
      },
      {
        title: "Automated Analysis and Artificial Intelligence Limitations",
        paragraphs: [
          "The current app runs calculations and spreadsheet parsing locally and uses rules to extract numbers from property descriptions. It does not generate analytical output through an AI API. Extracted values must be reviewed and edited before they are used.",
          "Software calculations and document interpretation can contain errors. If AI analysis is introduced in the future, it may include mathematical errors, unsupported conclusions, incorrect interpretations of documents, or inaccurate property information.",
          "Users should independently verify all important data, calculations, and assumptions. Spreadsheet imports use stored values and do not recalculate workbook formulas.",
        ],
      },
      {
        title: "No Guarantee of Investment Performance",
        paragraphs: [
          "PropertyIQ does not guarantee the profitability, value, financial performance, or future appreciation of any property. Real estate investing involves risk, including potential loss of invested capital.",
        ],
      },
      {
        title: "Independent Professional Review",
        paragraphs: [
          "Before making investment, financing, acquisition, or disposition decisions, users should consider consulting qualified financial, legal, tax, lending, or real estate professionals.",
        ],
      },
      {
        title: "User Responsibility",
        paragraphs: [
          "By using PropertyIQ, you acknowledge that investment decisions remain your responsibility and that automated analysis should not be treated as a substitute for independent due diligence.",
        ],
      },
    ],
  },
  contact: {
    label: "Contact",
    title: "Contact PropertyIQ",
    introduction: ["PropertyIQ is operated by Lewis Adkins."],
    sections: [
      {
        title: "Contact details pending",
        paragraphs: [
          "A public contact email address has not been added yet. There is currently no contact form or privacy-request submission channel on this website. This page will be updated when contact details are available.",
          "Do not enter sensitive personal information into project notes as a support request. Project notes stay in your browser and are not delivered to the operator.",
        ],
      },
      {
        title: "Managing locally saved information",
        paragraphs: [
          "Your analyses and attached documents are saved in this browser. To remove them, clear PropertyIQ's site data in your browser settings, including local storage and IndexedDB. Export any work you need first.",
          "Downloaded backups and reports remain on your computer until you remove them. See the Privacy Policy for details about storage and your controls.",
        ],
      },
    ],
  },
};
export const legalIds = Object.keys(legalDocuments) as LegalId[];
export function legalIdFromHash(hash: string): LegalId | null {
  const id = hash.slice(1);
  return legalIds.includes(id as LegalId) ? (id as LegalId) : null;
}
