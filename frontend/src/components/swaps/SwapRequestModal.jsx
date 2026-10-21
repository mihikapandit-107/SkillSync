import { useState, useEffect } from 'react';
import { Check, AlertCircle, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { skillsApi } from '../../api/skills';
import { swapsApi } from '../../api/swaps';
import { authApi } from '../../api/auth';
import { formatApiError } from '../../api/client';
import { useAuth } from '../../context/useAuth';


export function SwapRequestModal({ isOpen, onClose, peer, onSent }) {
  const { isDemoMode } = useAuth();

  const [myOffers, setMyOffers] = useState([]);       // [{ id: skillId, name }]
  const [theirOffers, setTheirOffers] = useState([]); // [{ id: skillId, name }]
  const [offeredId, setOfferedId] = useState('');
  const [wantedId, setWantedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const peerName = peer?.user?.first_name || peer?.user?.username || 'there';

  // Load both skill lists and set sensible defaults every time the modal opens.
  useEffect(() => {
    if (!isOpen || !peer) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setSent(false);
      setError(null);
      setMessage(
        `Hi ${peerName}! I saw your ${peer.skill?.name || 'skill'} listing on SkillSync and would love to set up a skill swap.`
      );

      let mine = [];
      let theirs = [];

      if (isDemoMode) {
        // Demo mode never touches the API; the request is only simulated.
        mine = [{ id: 101, name: 'Python Programming' }];
        theirs = peer.skill ? [{ id: peer.skill.id, name: peer.skill.name }] : [];
      } else {
        try {
          const [mySkillsData, profile] = await Promise.all([
            skillsApi.getMySkills('offer'),
            authApi.getUserDetail(peer.user.id),
          ]);
          const rows = Array.isArray(mySkillsData) ? mySkillsData : (mySkillsData?.results || []);
          mine = rows.map((r) => ({ id: r.skill, name: r.skill_name }));
          theirs = (profile.offered_skills || []).map((s) => ({ id: s.id, name: s.name }));
        } catch (err) {
          if (!ignore) setError(formatApiError(err));
        }
      }

      // The clicked card's skill must be selectable even if the profile call failed.
      if (peer.skill_type === 'offer' && peer.skill && !theirs.some((s) => s.id === peer.skill.id)) {
        theirs = [...theirs, { id: peer.skill.id, name: peer.skill.name }];
      }

      if (ignore) return;
      setMyOffers(mine);
      setTheirOffers(theirs);

      // Defaults:
      //  - card = peer OFFERS a skill   -> wanted is that skill, offered is my first offer
      //  - card = peer WANTS a skill    -> offered is that skill (if I teach it), wanted is their first offer
      if (peer.skill_type === 'offer') {
        setWantedId(peer.skill?.id ?? '');
        setOfferedId(mine[0]?.id ?? '');
      } else {
        const iTeachIt = mine.some((s) => s.id === peer.skill?.id);
        setOfferedId(iTeachIt ? peer.skill.id : (mine[0]?.id ?? ''));
        setWantedId(theirs[0]?.id ?? '');
      }
      setLoading(false);
    };

    load();
    return () => {
      ignore = true;
    };
    // peerName is derived from peer, so peer is enough.
  }, [isOpen, peer, isDemoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!offeredId || !wantedId) {
      setError('Choose which skill you offer and which skill you want in return.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (!isDemoMode) {
        await swapsApi.create({
          receiver: peer.user.id,
          offered_skill: Number(offeredId),
          wanted_skill: Number(wantedId),
          message: message.trim(),
        });
      }
      setSent(true);
      onSent?.();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !peer) return null;

  const hasNoOffers = !loading && myOffers.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request a swap with ${peerName}`}
      footer={
        sent ? (
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
              disabled={submitting || loading || hasNoOffers}
            >
              <Send size={15} />
              {submitting ? 'Sending...' : 'Send request'}
            </button>
          </>
        )
      }
    >
      {sent ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--success-subtle)',
              color: 'var(--success-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <Check size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Request sent</h3>
          <p>
            {peerName} will be notified. Once they accept, you can schedule a session.
            {isDemoMode && ' (Demo mode: nothing was saved.)'}
          </p>
        </div>
      ) : loading ? (
        <p style={{ textAlign: 'center', padding: '1.5rem 0' }}>Loading skills...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
            </div>
          )}

          {hasNoOffers && (
            <div className="alert alert-info">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                You need at least one skill you can teach before sending a swap request.
                Add one under My Skills, then try again.
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="swap-offered">I will teach</label>
            <select
              id="swap-offered"
              className="form-select"
              value={offeredId}
              onChange={(e) => setOfferedId(e.target.value)}
              disabled={hasNoOffers}
            >
              <option value="">-- Choose one of your skills --</option>
              {myOffers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="swap-wanted">
              In exchange, I want to learn
            </label>
            <select
              id="swap-wanted"
              className="form-select"
              value={wantedId}
              onChange={(e) => setWantedId(e.target.value)}
            >
              <option value="">-- Choose one of their skills --</option>
              {theirOffers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {theirOffers.length === 0 && (
              <span className="form-error" style={{ color: 'var(--text-muted)' }}>
                {peerName} has not listed any skills they can teach, so a swap is not possible yet.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="swap-message">Message</label>
            <textarea
              id="swap-message"
              className="form-textarea"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}