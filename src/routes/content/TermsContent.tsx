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
 *
 * Edited by hand, 29 Oct 2026 (Premium becomes a yearly subscription; the owner's review
 * before publishing): a new section 4, "CyprusWay Premium" (what it unlocks, the store
 * takes the payment, the €4.99 yearly subscription and how to cancel it in Apple's
 * settings, the 12-month pass, restoring, one account at a time, refunds through Apple or
 * Google, deleting the account does not cancel, price changes), sections 4–9 renumbered
 * 5–10, one sentence in section 2 naming Premium, and section 3's bullets say "for
 * bookings" so they no longer read as if the app took no payment at all. 4.4 (the pass)
 * goes if the pass is not sold. Set "Last updated" when this is published.
 */
import styles from './prose.module.css';

export function TermsContent() {
  return (
    <div className={styles.prose}>
      <h1>Terms of Service</h1>
      <p>Last updated: October 2026</p>
      <h2>1. Acceptance of terms</h2>
      <p>By accessing this website or using the CyprusWay mobile application, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should not use the website or the application.</p>
      <p>These terms apply to the CyprusWay website and the CyprusWay mobile application, both operated by <strong>Almisource LTD</strong> ("CyprusWay," "we," "us," or "our").</p>
      <h2>2. Description of service</h2>
      <p>CyprusWay provides a mobile travel companion app and website that help users discover curated places across Cyprus, plan personalised trip itineraries, ask travel questions, and connect to third-party booking providers for hotels, car rental, activities, and transfers. Some features — every 360° virtual tour, the AI trip planner, a larger daily allowance for Ask Pete and the full restaurant guide — are part of CyprusWay Premium, a paid plan described in section 4. Everything else is free to use.</p>
      <p>The content on this website and in the CyprusWay app — including place descriptions, travel recommendations, practical tips, and other information — is provided for general informational purposes. We make reasonable efforts to keep it accurate and current, but we do not guarantee its completeness or correctness. Travel information changes; you should verify critical details (opening hours, entrance fees, availability) directly with the relevant venue or provider.</p>
      <h2>3. Third-party bookings</h2>
      <p>CyprusWay is <strong>not</strong> a travel agent, booking platform, hotel operator, car rental company, activity provider, or transfer service. When you make a booking through a link in the CyprusWay app, you are contracting directly with the third-party provider — not with CyprusWay. CyprusWay does not:</p>
      <ul>
      <li>Process payments for bookings</li>
      <li>Hold or manage reservations</li>
      <li>Set prices or availability</li>
      <li>Handle booking cancellations, refunds, or disputes</li>
      <li>Provide customer service for bookings</li>
      </ul>
      <p>All booking-related issues — including cancellations, refunds, changes, complaints, and disputes — must be resolved directly with the third-party provider. CyprusWay's role is limited to connecting you to those providers. CyprusWay may earn a commission from bookings made through these connections, as disclosed in our Privacy Policy.</p>
      <h2>4. CyprusWay Premium</h2>
      <p><strong>4.1 What it is.</strong> CyprusWay Premium is the paid plan of the CyprusWay app. It unlocks, for one CyprusWay account, every 360° virtual tour, the AI trip planner, a larger daily allowance for Ask Pete and the full restaurant guide, as shown in the app at the time you buy. Anything the app marks "coming soon" is not part of Premium until it is released. Premium belongs to your account: sign in with it on any phone, and on this website, and Premium is there.</p>
      <p><strong>4.2 Where and how you buy it.</strong> Premium is bought inside the app, through Apple's App Store on an iPhone or iPad and, once it is offered there, through Google Play on Android. You must be signed in to a CyprusWay account; a guest can read the offer but cannot buy. Apple or Google takes the payment and shows the price in your own currency, VAT included; the price shown in the app at the moment you buy is the one that applies. Their terms of sale apply to the payment itself. We never see your card details.</p>
      <p><strong>4.3 The yearly subscription.</strong> The standard way to buy Premium is a subscription of €4.99 a year (or the local price the store shows). It renews by itself every 12 months, at the price the store shows at the time, until you cancel. Apple or Google charges your Apple ID or Google account when you buy and again at the start of each new year. You can cancel at any time: on an iPhone open <strong>Settings</strong>, tap your name, then <strong>Subscriptions</strong>, then <strong>CyprusWay Premium</strong>; the app's Account screen has a <strong>Manage subscription</strong> button that opens the same place. To avoid the next charge, cancel at least 24 hours before the current year ends. Cancelling never takes away what you have paid for: Premium stays until the end of the year you paid for, and nothing renews after that.</p>
      <p><strong>4.4 The 12-month pass.</strong> Where we offer it, you can instead buy Premium as a 12-month pass for €4.99 (or the local price the store shows): one payment, the same features for 12 months from the moment of purchase, then it ends. The pass never renews and never charges you again, so there is nothing to cancel; if you want Premium again afterwards, you buy again.</p>
      <p><strong>4.5 New phone, reinstall, restore.</strong> Your purchase is tied to your Apple ID or Google account and to your CyprusWay account. On a new phone, or after reinstalling, sign in to the same CyprusWay account and tap <strong>Restore purchases</strong> in Account. Restoring brings back what you already paid for. It never starts a new year, never moves the end date and never charges you.</p>
      <p><strong>4.6 One account at a time.</strong> A purchase unlocks one CyprusWay account at a time. If you sign in to a different CyprusWay account with the same Apple ID or Google account and restore purchases, Premium moves to that account and leaves the other.</p>
      <p><strong>4.7 Refunds.</strong> Because Apple or Google takes the payment, Apple or Google decides and pays any refund, under its own terms, including any right you have under the law to cancel a purchase within 14 days. On an iPhone, ask at <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>; on Android, through your Google Play order history. We cannot issue a refund ourselves or change the store's decision. If a purchase is refunded, Premium on that account ends the same day.</p>
      <p><strong>4.8 Deleting your account does not cancel a subscription.</strong> If you delete your CyprusWay account, delete the app or simply stop using it, a yearly subscription goes on renewing and Apple or Google goes on charging your Apple ID or Google account until you cancel it there, as in 4.3. Cancel first, then delete. A pass needs no cancelling.</p>
      <p><strong>4.9 Changes.</strong> We may improve, replace or add to what Premium includes, and we may change the price for new purchases. For a running subscription, a price change can only take effect from a later renewal, after Apple or Google has told you about it and, where the store requires it, you have agreed; if you do not agree, the subscription ends at the end of the current year and you keep Premium until then.</p>
      <p><strong>4.10 Problems.</strong> If you paid and Premium did not unlock, do not buy again: tap Restore purchases, and if that does not help, write to us (section 10) with the date of the purchase and we will find it.</p>
      <h2>5. Acceptable use</h2>
      <p>You agree to use this website and the CyprusWay app lawfully and responsibly. You must not:</p>
      <ul>
      <li>Use the service in any way that violates applicable laws or regulations</li>
      <li>Attempt to interfere with the proper functioning of the website or app</li>
      <li>Extract, scrape, or republish our content without permission</li>
      <li>Use the service to transmit harmful, abusive, or unlawful material</li>
      </ul>
      <h2>6. Intellectual property</h2>
      <p>All content on this website and the CyprusWay app — including text, descriptions, images, graphics, and the CyprusWay name and wordmark — is the intellectual property of Almisource LTD or its licensors. You may not reproduce, distribute, or create derivative works from our content without our prior written permission.</p>
      <h2>7. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, Almisource LTD and its directors, employees, and affiliates shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of this website or the CyprusWay app, including but not limited to:</p>
      <ul>
      <li>Errors or omissions in place information or travel content</li>
      <li>Issues arising from bookings made with third-party providers</li>
      <li>Service interruptions or unavailability</li>
      <li>Loss of data, revenue, or anticipated savings</li>
      </ul>
      <p>Nothing in these terms limits liability for death or personal injury caused by negligence, or for fraud or fraudulent misrepresentation.</p>
      <h2>8. Availability and changes</h2>
      <p>We do not guarantee that this website or the CyprusWay app will be available at all times. We may suspend, withdraw, or modify the service without notice. We may also update these Terms of Service from time to time. Changes take effect when posted on this page, and the "Last updated" date will be revised accordingly. Your continued use of the service after changes are posted constitutes acceptance of the revised terms.</p>
      <h2>9. Governing law</h2>
      <p>These Terms of Service are governed by the laws of the Republic of Cyprus. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the Republic of Cyprus.</p>
      <h2>10. Contact</h2>
      <p>If you have questions about these Terms of Service, contact us at:</p>
      <p><strong>Email:</strong> <a href="mailto:partners@cyprusway.eu">partners@cyprusway.eu</a><br />
      <strong>Company:</strong> Almisource LTD</p>
    </div>
  );
}
