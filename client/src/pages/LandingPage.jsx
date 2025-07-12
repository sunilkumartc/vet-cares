import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  PawPrint, 
  Calendar, 
  CreditCard, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTrial = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Call the public signup endpoint
      const response = await fetch('/api/public/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicName: clinicName,
          email: email,
          password: Math.random().toString(36).slice(-8), // Generate a random password
          ownerName: email.split('@')[0], // Use email prefix as owner name
          plan: 'trial'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to the new clinic's subdomain
        window.location.href = result.login_url;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create clinic. Please try again.');
      }
    } catch (error) {
      console.error('Error creating clinic:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Staff Management",
      description: "Manage your veterinary team with role-based permissions"
    },
    {
      icon: <PawPrint className="w-6 h-6" />,
      title: "Pet Records",
      description: "Comprehensive medical records and vaccination tracking"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Appointment Scheduling",
      description: "Easy appointment booking and calendar management"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Billing & Invoicing",
      description: "Professional invoicing and payment processing"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Data Security",
      description: "HIPAA-compliant data protection and backup"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-time Updates",
      description: "Instant notifications and real-time data sync"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small clinics",
      features: [
        "Up to 5 staff members",
        "Up to 500 pets",
        "Basic appointment scheduling",
        "Email support",
        "Mobile app access"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Ideal for growing practices",
      features: [
        "Up to 15 staff members",
        "Up to 2000 pets",
        "Advanced reporting",
        "Priority support",
        "Custom branding",
        "API access"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For large veterinary groups",
      features: [
        "Unlimited staff",
        "Unlimited pets",
        "Multi-location support",
        "24/7 phone support",
        "Custom integrations",
        "Dedicated account manager"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <PawPrint className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">VetVault</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/login'}>
                Sign In
              </Button>
              <Button onClick={() => document.getElementById('get-started').scrollIntoView()}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Modern Veterinary Practice Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your veterinary clinic operations with our comprehensive SaaS platform. 
            Manage patients, appointments, billing, and staff all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => document.getElementById('get-started').scrollIntoView()}
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => document.getElementById('demo').scrollIntoView()}
            >
              Watch Demo
            </Button>
          </div>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center space-x-8 text-gray-600">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-400 mr-1" />
              <span>4.9/5 from 500+ clinics</span>
            </div>
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-1" />
              <span>10,000+ pets managed</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
              <span>99.9% uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Clinic
            </h2>
            <p className="text-lg text-gray-600">
              Powerful features designed specifically for veterinary practices
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600">
              Choose the plan that fits your clinic's needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.name === 'Starter' ? 'Start Free Trial' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Clinic?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Get started with a free 14-day trial. No credit card required.
          </p>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <form onSubmit={handleStartTrial} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Clinic Name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Start Free Trial'}
                </Button>
              </form>
              <p className="text-sm text-gray-500 mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <PawPrint className="w-8 h-8 text-blue-400 mr-3" />
                <h3 className="text-xl font-bold">VetVault</h3>
              </div>
              <p className="text-gray-400">
                Modern veterinary practice management software designed to streamline your operations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
                <li><a href="#" className="hover:text-white">Training</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 VetVault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 