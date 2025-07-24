"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  PawPrint,
  Calendar,
  CreditCard,
  Shield,
  Zap,
  Star,
  Menu,
  X,
  ChevronRight,
  FileText,
  MessageCircle,
  BarChart3,
  Database,
  Smartphone,
  Settings,
  CheckCircle,
} from "lucide-react"

export default function VetVaultLanding() {
  const [email, setEmail] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const scrollingTextRef = useRef(null)

  // Auto-scrolling text animation
  useEffect(() => {
    const scrollingElement = scrollingTextRef.current
    if (scrollingElement) {
      const scrollWidth = scrollingElement.scrollWidth
      const clientWidth = scrollingElement.clientWidth
      let scrollPosition = 0

      const scroll = () => {
        scrollPosition += 1
        if (scrollPosition >= scrollWidth - clientWidth) {
          scrollPosition = 0
        }
        scrollingElement.scrollLeft = scrollPosition
      }

      const interval = setInterval(scroll, 30)
      return () => clearInterval(interval)
    }
  }, [])

  // Auto-rotating testimonials
  useEffect(() => {
    const testimonials = [
      {
        name: "Dr. Sarah Johnson",
        role: "Manager/Technician",
        clinic: "Paws & Claws Veterinary Hospital",
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
        quote:
          "First and foremost, the software is so easy to use and very functional. One of the great things about it is being able to access it ANYWHERE. The pet-parent portal is also genius, and our clients are definitely fans!",
        rating: 5,
      },
      {
        name: "Dr. Michael Chen",
        role: "CVO",
        clinic: "Veterinary United",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
        quote:
          "Now we can get a real-time snapshot of what's going on with our business, quickly identify trends, gauge efficiency, and make data-driven decisions.",
        rating: 5,
      },
      {
        name: "Dr. Emily Rodriguez",
        role: "Office Manager & RVT",
        clinic: "FenVet",
        image: "https://images.unsplash.com/photo-1594824388853-d0c2d4e5b1b5?w=150&h=150&fit=crop&crop=face",
        quote:
          "We've been using VetVault for about 18 months now, and it's been a successful, smooth transition. The staff loves the user-friendly design.",
        rating: 5,
      },
    ]

    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleStartTrial = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/public/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicName: clinicName,
          email: email,
          password: Math.random().toString(36).slice(-8),
          ownerName: email.split("@")[0],
          plan: "trial",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        window.location.href = result.login_url
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create clinic. Please try again.")
      }
    } catch (error) {
      console.error("Error creating clinic:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Health Records",
      description: "You can have it all — collaborative records, SOAP templates, integrations, automation, and more.",
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Online Appointments",
      description: "Reduce phone calls with your own personalized booking system!",
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Invoicing",
      description:
        "Be ready for check-out with automatic invoicing, and quick & integrated payments. Downpayments, split payments, refunds.",
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Stock Management",
      description: "Kick inventory stress to a curb and keep your stock up to date, in real-time.",
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Pet Parent App",
      description: "Offer the vet-in-your-pocket experience to your clients with a custom-branded mobile app.",
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Chat & Telemedicine",
      description: "Stay in touch with your patients with chat, telehealth & telemedicine features.",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Reports",
      description: "Advanced reporting on finances, stock, appointments, clients & patients.",
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Data Migration",
      description: "Your data comes with you! We offer smooth data migration, no matter your previous software.",
    },
  ]

  const testimonials = [
    {
      name: "Dr. Sarah Johnson",
      role: "Manager/Technician",
      clinic: "Paws & Claws Veterinary Hospital",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
      quote:
        "First and foremost, the software is so easy to use and very functional. One of the great things about it is being able to access it ANYWHERE. The pet-parent portal is also genius, and our clients are definitely fans! The chat function and diary updates are great for managing difficult cases.",
      rating: 5,
    },
    {
      name: "Dr. Michael Chen",
      role: "CVO",
      clinic: "Veterinary United",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      quote:
        "Now we can get a real-time snapshot of what's going on with our business, quickly identify trends, gauge efficiency, and make data-driven decisions. Tasks that previously consumed two weeks now require just five minutes.",
      rating: 5,
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Office Manager & RVT",
      clinic: "FenVet",
      image: "https://images.unsplash.com/photo-1594824388853-d0c2d4e5b1b5?w=150&h=150&fit=crop&crop=face",
      quote:
        "We've been using VetVault for about 18 months now, and it's been a successful, smooth transition. There are several really neat features that our staff have been enjoying, mainly because they align with the modern workflow.",
      rating: 5,
    },
    {
      name: "Dr. James Wilson",
      role: "Practice Owner",
      clinic: "Eagleswood Veterinary Hospital",
      image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
      quote:
        "VetVault bills itself as 'modern veterinary software you wish you'd had sooner,' which is straightforward as it sounds. It also happens to be true... It's like upgrading from a PDA to an iPhone, it just works.",
      rating: 5,
    },
  ]

  const trustedLogos = [
    { name: "TechCrunch", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b9/TechCrunch_logo.svg" },
    { name: "DVM 360", logo: "https://via.placeholder.com/120x60/4F46E5/FFFFFF?text=DVM360" },
    { name: "VetTech", logo: "https://via.placeholder.com/120x60/4F46E5/FFFFFF?text=VetTech" },
    { name: "AVMA", logo: "https://via.placeholder.com/120x60/4F46E5/FFFFFF?text=AVMA" },
    { name: "SAVE", logo: "https://via.placeholder.com/120x60/4F46E5/FFFFFF?text=SAVE" },
  ]

  const scrollingFeatures = [
    "Health records",
    "Online appointments",
    "Invoicing",
    "Stock Management",
    "Pet Parent app",
    "Chat & Telemedicine",
    "Reports",
    "Data migration",
    "Cloud-based veterinary software",
  ]

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center mr-6">
              <PawPrint className="w-8 h-8 text-cyan-500 mr-3" />
              <h1 className="text-2xl font-bold text-slate-900">VetVault</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <div className="relative group">
                <button className="text-slate-600 hover:text-slate-900 transition-colors flex items-center">
                  Solutions <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a
                href="#ai-assistant"
                className="text-slate-600 hover:text-slate-900 transition-colors flex items-center"
              >
                <Zap className="w-4 h-4 mr-1 text-indigo-500" /> AI Assistant
              </a>
              <a href="#integrations" className="text-slate-600 hover:text-slate-900 transition-colors">
                Integrations
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <a href="#academy" className="text-slate-600 hover:text-slate-900 transition-colors">
                Academy
              </a>
              <div className="relative group">
                <button className="text-slate-600 hover:text-slate-900 transition-colors flex items-center">
                  Resources <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" className="text-cyan-500">
                Login
              </Button>
              <Button variant="ghost" className="text-slate-600">
                Help Center
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-lg">Book a Demo</Button>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col space-y-4">
                <a href="#features" className="text-slate-600 hover:text-slate-900">
                  Features
                </a>
                <a href="#pricing" className="text-slate-600 hover:text-slate-900">
                  Pricing
                </a>
                <a href="#testimonials" className="text-slate-600 hover:text-slate-900">
                  Reviews
                </a>
                <div className="flex flex-col space-y-2 pt-4">
                  <Button variant="ghost">Login</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Book a Demo</Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  The <span className="text-indigo-600">all-in-one software</span> for better veterinary care.
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Cutting-edge veterinary software for simpler operations, improved pet care, and getting home on time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4 rounded-lg transform hover:scale-105 transition-all duration-200"
                  onClick={() => document.getElementById("get-started")?.scrollIntoView()}
                >
                  Book a Demo
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex flex-wrap items-center gap-6 text-slate-600">
                <div className="flex items-center">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2">75+ reviews</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10">
                <img
                  src="https://i.postimg.cc/44mL3NR3/Chat-GPT-Image-Jul-24-2025-02-54-10-PM.png"
                  alt="VetVault Dashboard"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl transform rotate-3 scale-105 opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Features Banner */}
      <section className="py-4 bg-indigo-600 text-white overflow-hidden">
        <div
          ref={scrollingTextRef}
          className="flex whitespace-nowrap"
          style={{
            animation: "scroll 30s linear infinite",
            width: "max-content",
          }}
        >
          {[...Array(3)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center">
              {scrollingFeatures.map((feature, index) => (
                <React.Fragment key={`${setIndex}-${index}`}>
                  <span className="text-lg font-medium px-8">{feature}</span>
                  <span className="text-cyan-300">•</span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              The all-in-one <span className="text-cyan-500">pet business software</span> that you can trust and grow
              with
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center space-y-4 p-6 rounded-xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-indigo-600">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nurture Relationships Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-slate-900">
                Nurture <span className="text-indigo-600">relationships</span> and{" "}
                <span className="text-cyan-500">increase</span> compliance
              </h2>
              <div className="w-16 h-1 bg-cyan-500"></div>
              <p className="text-lg text-slate-600 leading-relaxed">
                You no longer need multiple, disconnected tools. Our veterinary management software makes the entire
                patient journey easier and faster — for you and your patients. Retain your clients by giving them a
                modern experience before, during, and after the visit.
              </p>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&h=400&fit=crop"
                alt="Veterinarian with dog"
                className="w-full h-auto rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=40&h=40&fit=crop&crop=face"
                    alt="Dr. Miriam Simpson"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-sm">Miriam Simpson</div>
                    <div className="text-xs text-slate-500">DVM</div>
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 text-xs text-slate-400">
                  <span>10:00 AM</span>
                  <span>11:00 AM</span>
                  <span>12:00 PM</span>
                  <span>03:00 PM</span>
                  <span>05:00 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Saving Time Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&h=400&fit=crop"
                alt="Veterinarian with cat"
                className="w-full h-auto rounded-2xl shadow-xl"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-indigo-600">
                Saving time <span className="text-slate-900">can also be</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Our AI-powered assistant helps you complete tasks faster, from generating SOAP notes to managing
                appointments. Focus on what matters most - caring for your patients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section id="ai-assistant" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-slate-900">
                Get Home on Time With <span className="text-cyan-500">Tails</span>{" "}
                <span className="text-indigo-600">AI</span>
              </h2>
              <div className="w-16 h-1 bg-cyan-500"></div>
              <p className="text-lg text-slate-600 leading-relaxed">
                Your AI-powered veterinary assistant automates SOAP notes, patient summaries, treatment planning,
                patient intake, and more!
              </p>
            </div>
            <div className="relative">
              <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=64&h=64&fit=crop"
                      alt="Tails AI Fox"
                      className="w-12 h-12 rounded-full"
                    />
                  </div>
                  <div className="bg-indigo-500 rounded-2xl px-6 py-3">
                    <span className="text-lg font-medium">Chat with Tails</span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 bg-cyan-400 bg-opacity-30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meow or Never CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-100 to-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-200 rounded-3xl p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl font-bold text-indigo-600 mb-6">{"It's meow or never!"}</h2>
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4 rounded-lg">
                  Book a Demo
                </Button>
              </div>
              <div className="flex justify-center lg:justify-end">
                <img
                  src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=300&h=300&fit=crop"
                  alt="Cute cat with winter hat"
                  className="w-64 h-64 object-cover rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-indigo-600 mb-8">Stay in touch! Join our newsletter</h3>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input type="email" placeholder="Your Email Address" className="flex-1 h-12" />
            <Button className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8">Subscribe</Button>
          </div>
        </div>
      </section>

      {/* Dreading Change Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              <span className="text-cyan-500">Dreading change?</span>
            </h2>
            <h3 className="text-3xl font-bold text-indigo-600">
              {"We've made it"} <span className="text-slate-900">our mission to make change</span> easy peasy!
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-slate-50 border-0 p-8 text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Settings className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-600 mb-4">Smooth data migration</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  in-house migration team
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  access to a testing environment for data validation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  data conversion from any veterinary software
                </li>
              </ul>
            </Card>

            <Card className="bg-slate-50 border-0 p-8 text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-600 mb-4">Training & onboarding</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  dedicated workflow consultant
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  personalized onboarding and training plan
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  assistance on go live date
                </li>
              </ul>
            </Card>

            <Card className="bg-slate-50 border-0 p-8 text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-600 mb-4">Support</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  dedicated support team
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  comprehensive knowledge base
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Single Software CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            A single veterinary software to achieve more with <span className="text-cyan-300">less work</span>
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
            VetVault is the all-in-one veterinary practice management software that allows you to run your entire
            practice with one single tool. We are your trusted partner to enhance patient engagement, streamline your
            processes, and grow your practice.
          </p>
          <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-lg px-8 py-4 rounded-lg">
            Book a Demo
          </Button>
        </div>
      </section>

      {/* Discover Section */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-indigo-600 mb-8">
            Discover the only <span className="text-cyan-500">all-in-one</span> veterinary software for animal hospitals
          </h2>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4 rounded-lg">
            Book a Demo
          </Button>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-indigo-600 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your peers in other 🇺🇸 general practices are in awe!</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white bg-opacity-10 backdrop-blur-sm border-0 p-6">
                <CardContent className="p-0">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-white mb-6 italic">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center space-x-3">
                    <img
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-indigo-200 text-sm">
                        {testimonial.role} at {testimonial.clinic}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured In Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-slate-500 font-medium mb-4">FEATURED IN</p>
            <p className="text-slate-600">
              TRUSTED BY 1000+ practices, 4000+ veterinarians, 10+ universities & shelters
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {trustedLogos.map((logo, index) => (
              <img
                key={index}
                src={logo.logo || "/placeholder.svg"}
                alt={logo.name}
                className="h-12 grayscale hover:grayscale-0 transition-all duration-300"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to transform your clinic?</h2>
          <p className="text-xl text-slate-600 mb-12">Get started with a free 14-day trial. No credit card required.</p>

          <Card className="max-w-md mx-auto shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={handleStartTrial} className="space-y-6">
                <div>
                  <Input
                    type="text"
                    placeholder="Clinic Name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Start Free Trial"}
                </Button>
              </form>
              <p className="text-sm text-slate-500 mt-6">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-6">
                <PawPrint className="w-8 h-8 text-cyan-400 mr-3" />
                <h3 className="text-2xl font-bold">VetVault</h3>
              </div>
              <p className="text-slate-400 mb-6">
                The <span className="text-cyan-400">all-in-one</span> software for animal hospitals
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700 mb-6">Book a Demo</Button>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg text-slate-300">OUR SOFTWARE</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    PIMS Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pet Parent App
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Get the App 📱
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg text-slate-300">FOR ANIMAL HOSPITALS</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Brick & Mortar
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Multi Locations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Mobile Vets
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Request a Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg text-slate-300">COMPARE</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    VetVault vs. AVImark
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    VetVault vs. Impromed
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    VetVault vs. Cornerstone
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    VetVault vs. Hippo
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2024 VetVault. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  )
}
