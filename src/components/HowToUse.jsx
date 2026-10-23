const GUIDE_SECTIONS = [
  {
    title: 'Create your account',
    body: (
      <>
        <p>
          Click <strong>Login</strong> in the header, then choose <strong>Register</strong>. Enter a
          username, your email and a password of at least 8 characters. Confirm your email address
          by following the link we send you, then log in.
        </p>
        <p>Your email is used for login and verification only — it can never be changed after registration.</p>
      </>
    )
  },
  {
    title: 'Find a release',
    body: (
      <>
        <p>
          Type an artist, album or label into the search bar. Use the format selector to narrow
          results to <strong>CD</strong>, <strong>Vinyl</strong> or <strong>Tape</strong>, then press
          Search. Results come from the Discogs database.
        </p>
        <p>Cannot find a release? Use <strong>Add Manually</strong> to enter it yourself.</p>
      </>
    )
  },
  {
    title: 'Build your collection',
    body: (
      <>
        <p>
          On a search result, choose <strong>+ Collection</strong> to add the release or{' '}
          <strong>+ Wishlist</strong> to save it for later.
        </p>
        <p>
          In <strong>My Collection</strong> you can edit details, add personal notes, remove items,
          switch between grid and list views, and sort or filter by format.
        </p>
      </>
    )
  },
  {
    title: 'Wishlist, sharing and export',
    body: (
      <>
        <p>
          Open <strong>Wishlist</strong> to move an item into your collection or remove it. Use the{' '}
          <strong>Share</strong> button in your collection to copy a public link that anyone can
          view without an account.
        </p>
        <p>
          <strong>Export CSV</strong> downloads your whole collection as a spreadsheet-friendly file
          for backup or analysis.
        </p>
      </>
    )
  },
  {
    title: 'Manage your account',
    body: (
      <>
        <p>
          Click your name in the header to open <strong>Account Settings</strong>. From there you can
          change your username or choose a new password. You will need your current password to set
          a new one.
        </p>
        <p>Use the moon/sun button in the header to switch between light and dark themes.</p>
      </>
    )
  }
];

export default function HowToUse() {
  return (
    <section className="howto" aria-labelledby="howto-title">
      <h2 id="howto-title" className="howto-title">How to use MyCollection</h2>
      <p className="howto-intro">
        New here? Open any section below for a quick, step-by-step explanation.
      </p>

      <div className="howto-list">
        {GUIDE_SECTIONS.map((section, index) => (
          <details className="howto-item" key={section.title}>
            <summary>
              <span className="howto-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="howto-label">{section.title}</span>
            </summary>
            <div className="howto-body">{section.body}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
