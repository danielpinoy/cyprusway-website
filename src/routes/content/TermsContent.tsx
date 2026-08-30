/* Ported by scripts/port-content.mjs from `main:terms.html`, then AMENDED BY HAND —
 * 30 Aug 2026, phase 7. It is no longer a verbatim port and re-running the script would
 * revert the correction below.
 *
 * One clause removed from the service description in §2: "preview them through 360°
 * virtual tours". `virtual_tour` is null on 181 of 181 published places, so the sentence
 * described a service that is not provided. This is legal copy and the change is a
 * deletion, not a rewrite — nothing else in the paragraph is touched.
 *
 * English only, as it was there: this page carried no data-i18n attributes. Presentation
 * classes were dropped; the prose stylesheet styles by element.
 */
import styles from './prose.module.css';

export function TermsContent() {
  return (
    <div className={styles.prose}>
      <h1>Terms of Service</h1>
      <p>Last updated: May 2026</p>
      <h2>1. Acceptance of terms</h2>
      <p>By accessing this website or using the CyprusWay mobile application, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should not use the website or the application.</p>
      <p>These terms apply to the CyprusWay marketing website and the CyprusWay mobile application, both operated by <strong>Almisource LTD</strong> ("CyprusWay," "we," "us," or "our").</p>
      <h2>2. Description of service</h2>
      <p>CyprusWay provides a mobile travel companion app and marketing website that help users discover curated places across Cyprus, plan personalised trip itineraries, ask travel questions, and connect to third-party booking providers for hotels, car rental, activities, and transfers.</p>
      <p>The content on this website and in the CyprusWay app — including place descriptions, travel recommendations, practical tips, and other information — is provided for general informational purposes. We make reasonable efforts to keep it accurate and current, but we do not guarantee its completeness or correctness. Travel information changes; you should verify critical details (opening hours, entrance fees, availability) directly with the relevant venue or provider.</p>
      <h2>3. Third-party bookings</h2>
      <p>CyprusWay is <strong>not</strong> a travel agent, booking platform, hotel operator, car rental company, activity provider, or transfer service. When you make a booking through a link in the CyprusWay app, you are contracting directly with the third-party provider — not with CyprusWay. CyprusWay does not:</p>
      <ul>
      <li>Process payments</li>
      <li>Hold or manage reservations</li>
      <li>Set prices or availability</li>
      <li>Handle cancellations, refunds, or disputes</li>
      <li>Provide customer service for bookings</li>
      </ul>
      <p>All booking-related issues — including cancellations, refunds, changes, complaints, and disputes — must be resolved directly with the third-party provider. CyprusWay's role is limited to connecting you to those providers. CyprusWay may earn a commission from bookings made through these connections, as disclosed in our Privacy Policy.</p>
      <h2>4. Acceptable use</h2>
      <p>You agree to use this website and the CyprusWay app lawfully and responsibly. You must not:</p>
      <ul>
      <li>Use the service in any way that violates applicable laws or regulations</li>
      <li>Attempt to interfere with the proper functioning of the website or app</li>
      <li>Extract, scrape, or republish our content without permission</li>
      <li>Use the service to transmit harmful, abusive, or unlawful material</li>
      </ul>
      <h2>5. Intellectual property</h2>
      <p>All content on this website and the CyprusWay app — including text, descriptions, images, graphics, and the CyprusWay name and wordmark — is the intellectual property of Almisource LTD or its licensors. You may not reproduce, distribute, or create derivative works from our content without our prior written permission.</p>
      <h2>6. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, Almisource LTD and its directors, employees, and affiliates shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of this website or the CyprusWay app, including but not limited to:</p>
      <ul>
      <li>Errors or omissions in place information or travel content</li>
      <li>Issues arising from bookings made with third-party providers</li>
      <li>Service interruptions or unavailability</li>
      <li>Loss of data, revenue, or anticipated savings</li>
      </ul>
      <p>Nothing in these terms limits liability for death or personal injury caused by negligence, or for fraud or fraudulent misrepresentation.</p>
      <h2>7. Availability and changes</h2>
      <p>We do not guarantee that this website or the CyprusWay app will be available at all times. We may suspend, withdraw, or modify the service without notice. We may also update these Terms of Service from time to time. Changes take effect when posted on this page, and the "Last updated" date will be revised accordingly. Your continued use of the service after changes are posted constitutes acceptance of the revised terms.</p>
      <h2>8. Governing law</h2>
      <p>These Terms of Service are governed by the laws of the Republic of Cyprus. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the Republic of Cyprus.</p>
      <h2>9. Contact</h2>
      <p>If you have questions about these Terms of Service, contact us at:</p>
      <p><strong>Email:</strong> <a href="mailto:partners@cyprusway.eu">partners@cyprusway.eu</a><br />
      <strong>Company:</strong> Almisource LTD</p>
    </div>
  );
}
