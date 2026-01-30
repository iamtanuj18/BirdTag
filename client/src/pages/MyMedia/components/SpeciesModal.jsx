import PropTypes from 'prop-types';

/**
 * Modal component for displaying all detected species
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Object} props.species - Object with species names as keys and counts as values
 * @param {Function} props.onClose - Callback when modal closes
 */
const SpeciesModal = ({ show, species, onClose }) => {
  if (!show) return null;

  const speciesCount = species ? Object.keys(species).length : 0;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
      <div 
        className="modal fade show" 
        style={{ display: 'block' }}
        tabIndex={-1}
        aria-labelledby="speciesModalLabel" 
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="speciesModalLabel">
                Species Detected: {speciesCount}
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose} 
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {species && Object.entries(species).map(([speciesName, count]) => (
                <div key={speciesName} className="modal-species-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="species-name">{speciesName}</span>
                    <span className="species-count">{count} detected</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

SpeciesModal.propTypes = {
  show: PropTypes.bool.isRequired,
  species: PropTypes.objectOf(PropTypes.number),
  onClose: PropTypes.func.isRequired
};

SpeciesModal.defaultProps = {
  species: null
};

export default SpeciesModal;
