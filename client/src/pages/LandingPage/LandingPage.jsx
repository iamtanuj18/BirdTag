import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../config";
import { useAuth } from "../../AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import { FeatureCard, StepCard, TechCard } from "../../components/Cards";
import { buildLoginUrl } from "../../utils/auth";
import { IMAGES } from "../../constants/images";
import {
  UploadIcon,
  SearchIcon,
  FilterIcon,
  ReverseSearchIcon,
  TagIcon,
  DatabaseIcon,
  ShieldIcon,
  ImageIcon,
  UploadStepIcon,
  ProcessStepIcon,
  DatabaseStepIcon,
  NotificationStepIcon,
  AIIcon,
  ServerIcon,
  LightningIcon,
  SecurityIcon,
  SparkleIcon,
  ArrowRightIcon
} from "../../components/Icons/FeatureIcons";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleAuth = () => {
    window.location.href = buildLoginUrl(config);
  };

  // Features Data
  const features = [
    {
      icon: <UploadIcon />,
      iconColor: "blue",
      title: "Upload & AI Species Identification",
      description: "Upload bird media files and the app will automatically identify all species present with their individual counts",
      techBadge: "YOLOv8 + BirdNET + S3 + Lambda"
    },
    {
      icon: <SearchIcon />,
      iconColor: "green",
      title: "Species Search",
      description: "Search by bird species name to find all files containing that species in the system",
      techBadge: "DynamoDB + API Gateway"
    },
    {
      icon: <FilterIcon />,
      iconColor: "purple",
      title: "Advanced Count-Based Query",
      description: "Find files by species name with minimum count threshold to filter results precisely",
      techBadge: "Lambda + DynamoDB + API Gateway"
    },
    {
      icon: <ReverseSearchIcon />,
      iconColor: "orange",
      title: "Reverse Image Search",
      description: "Upload any bird image to auto-identify the species and retrieve all matching files from the system",
      techBadge: "YOLOv8 + Lambda + DynamoDB"
    },
    {
      icon: <TagIcon />,
      iconColor: "pink",
      title: "Species Tag Management",
      description: "Manually edit detected species and their counts for single or multiple files with bulk update support",
      techBadge: "DynamoDB + Lambda + API Gateway"
    },
    {
      icon: <DatabaseIcon />,
      iconColor: "cyan",
      title: "Cloud Storage",
      description: "All uploaded files are securely stored in AWS S3 with automatic thumbnail generation",
      techBadge: "S3 + Lambda"
    },
    {
      icon: <ShieldIcon />,
      iconColor: "indigo",
      title: "Secure Authentication",
      description: "AWS Cognito-powered user pools with JWT-based API authorization",
      techBadge: "Cognito + JWT"
    },
    {
      icon: <ImageIcon />,
      iconColor: "yellow",
      title: "URL-Based File Lookup",
      description: "Look up file information using S3 file URLs or thumbnail URLs to retrieve metadata",
      techBadge: "API Gateway + Lambda"
    }
  ];

  // Steps data
  const steps = [
    {
      stepNumber: 1,
      icon: <UploadStepIcon />,
      title: "Upload Media",
      description: "Upload bird images, videos, or audio files through the app to AWS S3 cloud storage",
      techBadge: "S3 Event Trigger"
    },
    {
      stepNumber: 2,
      icon: <ProcessStepIcon />,
      title: "AI Species Analysis",
      description: "Lambda processes files using YOLOv8 and BirdNET to detect all species present and their counts",
      techBadge: "Lambda + YOLO + BirdNET"
    },
    {
      stepNumber: 3,
      icon: <DatabaseStepIcon />,
      title: "Store Metadata",
      description: "Detection results including species, counts, and thumbnails are saved to DynamoDB database",
      techBadge: "DynamoDB Write"
    },
    {
      stepNumber: 4,
      icon: <NotificationStepIcon />,
      title: "Get Notified",
      description: "Receive real-time SNS notifications for all file uploads, modifications, and deletions with detection results",
      techBadge: "SNS + Email"
    }
  ];

  // Tech Stack Data
  const techStack = [
    {
      icon: <AIIcon />,
      iconGradient: "purple",
      category: "AI/ML Models",
      items: ["YOLOv8 Object Detection", "BirdNET Audio AI", "Ultralytics Framework", "OpenCV Processing"]
    },
    {
      icon: <ServerIcon />,
      iconGradient: "orange",
      category: "AWS Backend",
      items: ["Lambda Functions", "DynamoDB NoSQL", "S3 Cloud Storage", "API Gateway"]
    },
    {
      icon: <LightningIcon />,
      iconGradient: "blue",
      category: "Event Processing",
      items: ["S3 Event Triggers", "SNS Notifications", "Lambda Functions", "API Gateway REST"]
    },
    {
      icon: <SecurityIcon />,
      iconGradient: "green",
      category: "Security & Auth",
      items: ["AWS Cognito", "JWT Authentication", "User Pools", "OAuth 2.0"]
    }
  ];

  return (
    <div className="min-vh-100">
      {/* Navbar */}
      <Navbar onAuthClick={handleAuth} />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container-fluid px-3 px-lg-5">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6 text-center text-lg-start">
              <div className="hero-badge mb-4">
                <SparkleIcon />
                Powered by YOLOv8, BirdNET & AWS
              </div>

              <h1 className="hero-title">
                AI-Powered Bird <span className="hero-title-gradient">Species Identification</span>
              </h1>

              <p className="hero-subtitle">
                Automatically identify bird species and count individual birds from your images, videos, and audio files using deep learning. Built on AWS serverless architecture for scalability and performance.
              </p>

              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start mb-4">
                <button className="btn btn-primary-hero" onClick={handleAuth}>
                  Analyze Your Bird Media
                  <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="hero-image-container position-relative">
                <img src={IMAGES.hero} alt="Colorful parrots" className="hero-image" />
                <div className="hero-detection-card">
                  <div>
                    <div className="detection-label">Detected Species</div>
                    <div className="detection-species">Northern Cardinal</div>
                    <div className="detection-label mt-1">Count: 2</div>
                  </div>
                </div>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container-fluid px-3 px-lg-5">
          <div className="text-center mb-5">
            <h2 className="section-title">Powerful Features for Bird Enthusiasts</h2>
          </div>

          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
            {features.map((feature, index) => (
              <div key={index} className="col">
                <FeatureCard
                  icon={feature.icon}
                  iconColor={feature.iconColor}
                  title={feature.title}
                  description={feature.description}
                  techBadge={feature.techBadge}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="container-fluid px-3 px-lg-5">
          <div className="text-center mb-5">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Real-time serverless processing pipeline from upload to notification
            </p>
          </div>

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 position-relative">
            {steps.map((step, index) => (
              <div key={index} className="col">
                <StepCard
                  stepNumber={step.stepNumber}
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  techBadge={step.techBadge}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="tech-stack-section">
        <div className="container-fluid px-3 px-lg-5">
          <div className="text-center mb-5">
            <h2 className="section-title">Technology Stack</h2>
            <p className="section-subtitle">
              Built with AWS serverless infrastructure and AI models
            </p>
          </div>

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 mb-5">
            {techStack.map((tech, index) => (
              <div key={index} className="col">
                <TechCard
                  icon={tech.icon}
                  iconGradient={tech.iconGradient}
                  category={tech.category}
                  items={tech.items}
                />
              </div>
            ))}
          </div>

          {/* Platform Stats */}
          <div className="row g-4 align-items-center">
            <div className="col-lg-6">
              <div className="tech-image-container">
                <img src={IMAGES.tech} alt="Bird in nature" className="tech-image" />
                <div className="tech-overlay">
                  <p className="mb-2 tech-progress-label">Detection in Progress</p>
                  <div className="tech-progress-bg">
                    <div className="tech-progress-bar"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="platform-capabilities-card">
                <h3 className="platform-title">Platform Capabilities</h3>

                <div className="capability-item">
                  <div className="capability-label">
                    <span className="text-dark">Serverless</span>
                    <span className="fw-bold text-primary">100%</span>
                  </div>
                  <div className="capability-bar-bg">
                    <div className="capability-bar capability-bar-full"></div>
                  </div>
                </div>

                <div className="capability-item">
                  <div className="capability-label">
                    <span className="text-dark">Cloud Native</span>
                    <span className="fw-bold text-primary">100%</span>
                  </div>
                  <div className="capability-bar-bg">
                    <div className="capability-bar capability-bar-full"></div>
                  </div>
                </div>

                <div className="capability-item">
                  <div className="capability-label">
                    <span className="text-dark">API Coverage</span>
                    <span className="fw-bold text-primary">REST</span>
                  </div>
                  <div className="capability-bar-bg">
                    <div className="capability-bar capability-bar-full"></div>
                  </div>
                </div>
              </div>

              <div className="stats-grid mt-4">
                <div className="stat-card">
                  <div className="stat-value">Elastic</div>
                  <div className="stat-label">Scalability</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">$0</div>
                  <div className="stat-label">Idle Cost</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container-fluid px-3 px-lg-5">
          <div className="text-center cta-container">
            <h2 className="cta-title">Ready to Identify Bird Species Automatically?</h2>

            <p className="cta-description">
              For bird lovers and wildlife enthusiasts. Upload your bird photos, videos, or audio recordings and let AI identify each species and count individual birds automatically.
            </p>

            <div className="d-flex justify-content-center mb-4">
              <button className="btn btn-cta-primary" onClick={handleAuth}>
                Start Now
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container-fluid px-3 px-lg-5">
          <hr className="footer-divider" />
          <div className="text-center pb-4">
            <a href="/" className="footer-brand-link">
              <span className="footer-brand-text">BirdTag</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
