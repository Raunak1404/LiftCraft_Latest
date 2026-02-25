export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const DAILY_LIMIT = 5;

export const AVIATION_FACTS = [
  "The Wright brothers' first flight lasted only 12 seconds!",
  "Airfoil camber creates lift by accelerating air over the curved surface.",
  "Reynolds number describes the ratio of inertial to viscous forces in fluid flow.",
  "Modern airliners cruise at about 80% the speed of sound.",
  "The Coandă effect helps keep airflow attached to curved surfaces.",
  "Laminar flow airfoils can reduce drag by up to 30%!",
  "The angle of attack is crucial - too high causes stall.",
  "Winglets can improve fuel efficiency by 3-5%.",
  "Supersonic flight creates shock waves that produce sonic booms.",
  "The lift coefficient depends on airfoil shape and angle of attack.",
  "CST method uses Bernstein polynomials for smooth airfoil shapes.",
  "Typical airfoil max thickness is at 30% chord location.",
  "Leading edge radius affects stall characteristics significantly.",
  "Moment coefficient indicates pitching behavior of the airfoil.",
  "High L/D ratios mean efficient flight with less drag.",
  "The camber line is the mean line between upper and lower surfaces.",
  "Pressure distribution creates lift - lower pressure on top!",
  "Boundary layer transition affects drag significantly.",
  "Modern CFD has revolutionized airfoil design.",
  "Neural networks can now predict airfoil performance instantly!",
  "Thin airfoil theory predicts a lift slope of approximately 2π per radian for symmetric airfoils at low angles of attack.",
  "Most subsonic airfoils operate efficiently between Reynolds numbers of 5×10⁵ and 5×10⁶.",
  "Positively cambered airfoils generate lift at zero angle of attack.",
  "Drag is primarily composed of skin-friction drag and pressure drag.",
  "Boundary layer separation is the primary cause of aerodynamic stall.",
  "Supercritical airfoils delay shock formation in transonic flight.",
  "The aerodynamic center of most airfoils lies near the quarter-chord point.",
  "Increasing airfoil thickness improves structural strength but increases drag.",
  "Flaps increase effective camber, enabling higher lift at lower speeds.",
  "Leading-edge slats delay stall by re-energizing the boundary layer.",
  "Laminar separation bubbles are common at low Reynolds numbers.",
  "Lift increases with the square of airspeed.",
  "Compressibility effects become significant above Mach 0.3.",
  "Symmetric airfoils are preferred for aerobatic aircraft due to neutral pitching moments.",
  "Poor pressure recovery near the trailing edge increases drag.",
  "Trailing-edge thickness affects wake behavior and acoustic noise.",
  "Wing washout is used to reduce the risk of wingtip stall.",
  "Airfoil performance is highly sensitive to surface roughness.",
  "At high altitude, higher airspeed or larger wing area is required to generate the same lift.",
  "Wind tunnel measurements require corrections to account for wall interference."
];

export const INPUT_RANGES = {
  CL_target: { min: -2, max: 3 },
  alpha: { min: -20, max: 20 },
  Re: { min: 10000, max: 10000000 },
  Cm_target: { min: -0.5, max: 0.5 },
  mach: { min: 0, max: 0.7 }
};

export const DEFAULT_INPUTS = {
  CL_target: '1.2',
  alpha: '5.0',
  Re: '1000000',
  mach: '0.0',
  airfoil_type: 'cambered',
  Cm_target: '',
  optimization_mode: 'single',
  offdesign_mode: 'stability',
  custom_points: ''
};
