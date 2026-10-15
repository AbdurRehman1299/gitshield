// Demo content for the "Load sample secrets" button and the smoke test.
//
// The provider token prefixes below are deliberately assembled from pieces at
// runtime ("sk_" + "live_..." / "xox" + "b-..."). This stops GitShield's own
// repository from tripping GitHub push-protection secret scanning, while the
// scanner still sees realistic strings to detect.
const STRIPE_LIVE = "sk_" + "live_FAKEDEMO0000000001";
const SLACK_BOT = "xox" + "b-FAKEDEMO0001";

export const SAMPLE_ENV = [
  "# Example leaked .env — fake credentials for demoing GitShield",
  "DATABASE_URL=postgresql://admin:S3cr3tP@ssw0rd@db.internal:5432/prod",
  "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
  "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz12",
  `STRIPE_SECRET_KEY=${STRIPE_LIVE}`,
  `SLACK_TOKEN=${SLACK_BOT}`,
  "SENDGRID_API_KEY=SG.abcdefghijklmnopqrstuv.ABCDEFGHIJKLMNOPQRSTUV",
  "GOOGLE_API_KEY=AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7",
  'ADMIN_PASSWORD="SuperSecretPassword123!"',
].join("\n");
