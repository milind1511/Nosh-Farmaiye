import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Profile.css";
import { StoreContext } from "../../context/StoreContext";

const Profile = () => {
  const { token, url } = useContext(StoreContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({ phone: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError("Please sign in to view your profile details.");
      return;
    }

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${url}/api/user/me`, {
          headers: { token },
          signal: controller.signal,
        });

        if (response.data?.success) {
          setProfile(response.data.data);
          setError(null);
        } else {
          setError(response.data?.message || "Unable to load your profile.");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError("We couldn't load your profile. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => controller.abort();
  }, [isAuthenticated, token, url]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const handleSignIn = () => {
    toast.info("Please sign in to see your profile details.");
    navigate("/", { state: { focusLogin: true } });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      setFormErrors((prev) => ({ ...prev, phone: "" }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "phone") {
      setFormErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validatePhone = (phoneValue) => {
    const trimmed = phoneValue.trim();
    if (!trimmed) return { valid: true, normalized: "" };
    if (!/^\d+$/.test(trimmed)) {
      return {
        valid: false,
        message: "Only digits are allowed in the phone number.",
      };
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length !== 10) {
      return {
        valid: false,
        message: "Phone number must contain exactly 10 digits.",
      };
    }
    return {
      valid: true,
      normalized: digits,
    };
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    const phoneCheck = validatePhone(formData.phone);
    if (!phoneCheck.valid) {
      setFormErrors((prev) => ({ ...prev, phone: phoneCheck.message }));
      toast.error(phoneCheck.message);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        phone: phoneCheck.normalized ?? formData.phone.trim(),
      };

      const response = await axios.put(
        `${url}/api/user/me`,
        payload,
        {
          headers: { token },
        }
      );

      if (response.data?.success) {
        const updated = response.data.data;
        setProfile(updated);
        setFormData({
          name: updated?.name || "",
          phone: updated?.phone || "",
        });
        setFormErrors({ phone: "" });
        toast.success("Profile updated");
      } else {
        toast.error(
          response.data?.message || "We couldn't update your profile."
        );
      }
    } catch (err) {
      toast.error("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = { currentPassword: "", newPassword: "", confirmPassword: "" };
    let valid = true;

    if (!passwordData.currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
      valid = false;
    }

    if (!passwordData.newPassword.trim()) {
      errors.newPassword = "New password is required.";
      valid = false;
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
      valid = false;
    }

    if (!passwordData.confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm the new password.";
      valid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
      valid = false;
    }

    if (valid && passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = "New password must differ from current password.";
      valid = false;
    }

    if (valid) {
      const strongPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPattern.test(passwordData.newPassword)) {
        errors.newPassword =
          "Include uppercase, lowercase, number, and special character.";
        valid = false;
      }
    }

    setPasswordErrors(errors);
    return valid;
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (!validatePasswordForm()) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    try {
      setPasswordSaving(true);
      const response = await axios.put(
        `${url}/api/user/me/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: { token },
        }
      );

      if (response.data?.success) {
        toast.success("Password updated");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setShowPasswordForm(false);
      } else {
        toast.error(
          response.data?.message || "We couldn't update your password."
        );
      }
    } catch (err) {
      toast.error("We couldn't update your password. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <section className="profile">
      <header className="profile__header">
        <h1>My Profile</h1>
        <p>Review your saved information and access quick actions.</p>
      </header>

      {loading ? (
        <div className="profile__state" role="status">
          <span className="profile__spinner" aria-hidden />
          <p>Fetching your profile...</p>
        </div>
      ) : error ? (
        <div className="profile__state profile__state--error">
          <p>{error}</p>
          {!isAuthenticated && (
            <button type="button" onClick={handleSignIn}>
              Go to sign in
            </button>
          )}
        </div>
      ) : (
        <div className="profile__content">
          <div className="profile__card">
            <h2>Account details</h2>
            <form className="profile__form" onSubmit={handleUpdateProfile}>
              <div className="profile__field">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleFieldChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  maxLength={64}
                  required
                />
              </div>

              <div className="profile__field profile__field--static">
                <label htmlFor="profile-email">
                  Email
                  <span
                    className="profile__info"
                    role="img"
                    aria-label="Email updates require contacting customer support"
                    data-tooltip="To update the email, reach out to customer support."
                    tabIndex={0}
                  >
                    i
                  </span>
                </label>
                <p id="profile-email" className="profile__value">
                  {profile?.email || "—"}
                </p>
              </div>

              <div className="profile__field">
                <label htmlFor="profile-phone">Phone number</label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleFieldChange}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                  maxLength={10}
                  aria-invalid={formErrors.phone ? "true" : "false"}
                />
                {formErrors.phone ? (
                  <p className="profile__error" role="alert">
                    {formErrors.phone}
                  </p>
                ) : null}
              </div>

              <div className="profile__form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>

          <div className="profile__card profile__card--password">
            <h2>Security</h2>
            <button
              type="button"
              className="profile__reset-trigger"
              onClick={() => {
                setShowPasswordForm((prev) => {
                  const next = !prev;
                  if (!next) {
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }
                  return next;
                });
              }}
            >
              {showPasswordForm ? "Cancel" : "Reset password"}
            </button>

            {showPasswordForm ? (
              <form className="profile__form" onSubmit={handleUpdatePassword}>
                <div className="profile__field">
                  <label htmlFor="profile-current-password">Current password</label>
                  <input
                    id="profile-current-password"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    required
                    aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
                  />
                  {passwordErrors.currentPassword ? (
                    <p className="profile__error" role="alert">
                      {passwordErrors.currentPassword}
                    </p>
                  ) : null}
                </div>

                <div className="profile__field">
                  <label htmlFor="profile-new-password">New password</label>
                  <input
                    id="profile-new-password"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    required
                    aria-invalid={passwordErrors.newPassword ? "true" : "false"}
                    minLength={8}
                  />
                  {passwordErrors.newPassword ? (
                    <p className="profile__error" role="alert">
                      {passwordErrors.newPassword}
                    </p>
                  ) : null}
                </div>

                <div className="profile__field">
                  <label htmlFor="profile-confirm-password">Confirm new password</label>
                  <input
                    id="profile-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    required
                    aria-invalid={passwordErrors.confirmPassword ? "true" : "false"}
                  />
                  {passwordErrors.confirmPassword ? (
                    <p className="profile__error" role="alert">
                      {passwordErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>

                <div className="profile__form-actions">
                  <button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? "Updating..." : "Update password"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="profile__actions">
            <Link to="/cart" className="profile__action">
              View Cart
            </Link>
            <Link to="/myorders" className="profile__action profile__action--primary">
              Track Orders
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default Profile;
