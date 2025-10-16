import "./AppDownload.css";
import { assets } from "../../assets/frontend_assets/assets";

const AppDownload = () => {
  return (
    <section
      className="app-download"
      id="app-download"
      aria-labelledby="app-download-heading"
    >
      <div className="app-download__content">
        <h2 id="app-download-heading">Bring our kitchen to your phone</h2>
        <p>
          Track live orders, unlock chef-curated combos, and save your festive
          favourites for one-tap reorders. The Nosh ऐप keeps every craving a
          tap away.
        </p>
      </div>
      <div className="app-download__platforms" aria-label="Download options">
        <a
          href="https://play.google.com/store/apps/details?id=com.noshfarmaiye"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={assets.play_store}
            alt="Get the Nosh Farmaiye app on Google Play"
          />
        </a>
        <a
          href="https://apps.apple.com/in/app/nosh-farmaiye/id000000000"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={assets.app_store}
            alt="Download the Nosh Farmaiye app on the App Store"
          />
        </a>
      </div>
    </section>
  );
};

export default AppDownload;
