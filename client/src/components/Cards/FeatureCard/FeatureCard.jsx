import PropTypes from 'prop-types';
import './FeatureCard.css';

const FeatureCard = ({ icon, iconColor, title, description, techBadge }) => {
  const iconStyles = {
    blue: { background: '#dbeafe', color: '#1e40af' },
    green: { background: '#d1fae5', color: '#065f46' },
    purple: { background: '#e9d5ff', color: '#6b21a8' },
    orange: { background: '#fed7aa', color: '#9a3412' },
    pink: { background: '#fbcfe8', color: '#9f1239' },
    cyan: { background: '#cffafe', color: '#155e75' },
    indigo: { background: '#c7d2fe', color: '#4338ca' },
    yellow: { background: '#fef3c7', color: '#92400e' }
  };

  return (
    <div className="feature-card">
      <div className="feature-icon" style={iconStyles[iconColor]}>
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      <span className="feature-tech-badge">
        <span className="tech-dot"></span>
        {techBadge}
      </span>
    </div>
  );
};

FeatureCard.propTypes = {
  icon: PropTypes.node.isRequired,
  iconColor: PropTypes.oneOf(['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'indigo', 'yellow']).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  techBadge: PropTypes.string.isRequired
};

export default FeatureCard;
