import { useState, useEffect } from 'react';
import { Star, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { reviewsApi } from '../../api/review';
import { formatApiError } from '../../api/client';

export function ReviewModal({ isOpen, onClose, session, onReviewed }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setHoverRating(0);
      setComment('');
      setError(null);
      setSubmitted(false);
    }
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const other = session.swap_detail?.requester_detail?.id === session.created_by
    ? session.swap_detail?.receiver_detail
    : session.swap_detail?.requester_detail;
  const peerName = other?.first_name || other?.username || 'your peer';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const review = await reviewsApi.create({
        session: session.id,
        rating,
        comment,
      });
      setSubmitted(true);
      onReviewed?.(review, session.id);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review your session with ${peerName}`}
      footer={
        submitted ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </>
        )
      }
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--success-subtle)',
            color: 'var(--success-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}>
            <CheckCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: '#f5edd8' }}>
            Review Submitted!
          </h3>
          <p style={{ color: '#9eb1c5', fontSize: '0.9rem' }}>
            Thank you for helping keep SkillSync trusted and collaborative.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '0.9rem', color: '#9eb1c5', marginBottom: '0.75rem' }}>
              How was your learning exchange?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.15s ease',
                      transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`${star} star`}
                  >
                    <Star
                      size={32}
                      fill={filled ? '#cca969' : 'transparent'}
                      color={filled ? '#cca969' : 'rgba(204, 169, 105, 0.4)'}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cca969', fontWeight: 600, marginTop: '0.5rem' }}>
              {rating === 5 && 'Outstanding - Learned a lot!'}
              {rating === 4 && 'Great - Very helpful session'}
              {rating === 3 && 'Good - Solid skill swap'}
              {rating === 2 && 'Fair - Room for improvement'}
              {rating === 1 && 'Poor - Did not meet expectations'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="review-comment">
              Feedback & Comments (optional)
            </label>
            <textarea
              id="review-comment"
              className="form-textarea"
              rows={4}
              placeholder="Share what you worked on, how clear the explanation was, or a word of appreciation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
