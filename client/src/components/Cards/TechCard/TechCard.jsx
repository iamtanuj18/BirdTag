import PropTypes from 'prop-types';
import './TechCard.css';

const TechCard = ({ icon, iconGradient, category, items }) => {
  const gradientStyles = {
    purple: { background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
    orange: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    blue: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    green: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }
  };

  return (
    <div className="tech-card">
      <div className="tech-icon" style={gradientStyles[iconGradient]}>
        {icon}
      </div>
      <h4 className="tech-category">{category}</h4>
      <ul className="tech-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

TechCard.propTypes = {
  icon: PropTypes.node.isRequired,
  iconGradient: PropTypes.oneOf(['purple', 'orange', 'blue', 'green']).isRequired,
  category: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default TechCard;
