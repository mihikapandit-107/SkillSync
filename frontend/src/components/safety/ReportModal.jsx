import { useState } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { safetyApi } from '../../api/safety';
import { formatApiError } from '../../api/client';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate', label: 'Inappropriate Content or Behavior' },
  { value: 'no_show', label: 'Repeatedly Missed Scheduled Sessions' },
  { value: 'fake_profile', label: 'Fake Profile or Impersonation' },
  { value: 'other', label: 'Other Issue' },
];

export function ReportModal({ isOpen, onClose, targetUser, onSuccess }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    if (reason === 'other' && !details.trim()) {
      setError('Please provide details explaining the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await safetyApi.submitReport({
        reported_user: targetUser.id,
        reason,
        details: details.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDetails('');
        setReason('spam');
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Student to Campus Moderators"
      maxWidth="480px"
      footer={
        success ? null : (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <ShieldAlert size={15} />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <CheckCircle size={44} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f5edd8' }}>Report Submitted</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Thank you for helping keep SkillSync safe. Our moderators will review this account promptly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Reporting <strong>@{targetUser?.username}</strong> ({targetUser?.first_name || targetUser?.username}).
            Your report is confidential and sent directly to staff moderators.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="report-reason">Reason for Report</label>
            <select
              id="report-reason"
              className="form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="report-details">
              Additional Details {reason === 'other' ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              id="report-details"
              className="form-textarea"
              rows={4}
              placeholder="Describe what occurred, dates, or relevant session context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
