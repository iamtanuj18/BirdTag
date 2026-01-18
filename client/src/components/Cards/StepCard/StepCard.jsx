import PropTypes from 'prop-types';
import './StepCard.css';

const StepCard = ({ stepNumber, icon, title, description, techBadge }) => {
  return (
    <div className="step-card">
      <div className="step-number">{stepNumber}</div>
      <div className="step-icon-container">
        {icon}
      </div>
      <h3 className="step-title">{title}</h3>
      <p className="step-description">{description}</p>
      {techBadge && (
        <span className="step-tech-badge">{techBadge}</span>
      )}
    </div>
  );
};

StepCard.propTypes = {
  stepNumber: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  techBadge: PropTypes.string
};

export default StepCard;
