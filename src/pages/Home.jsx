
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Stethoscope, ShieldCheck, Phone, MapPin, Clock, MessageCircle, X, Send, Menu, User as UserIcon, Star, Award, Users, Calendar, Camera, Utensils, Activity, BookOpen, Smile, Sparkles, HeartHandshake, Siren } from "lucide-react";
import { User } from '@/api/tenant-entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import VirtualChat from '../components/home/VirtualChat';
import AuthModal from '../components/home/AuthModal';
import ServicesGrid from '../components/home/ServicesGrid'; // New import for the refactored services section

// The 'services' array has been moved to the ServicesGrid component.

const successStories = [
  {
    id: 1,
    petName: "Buddy",
    ownerName: "Priya Sharma",
    story: "Buddy came to us with severe skin allergies. After our comprehensive treatment plan and dietary changes, he's now completely healthy and playful!",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=800&auto=format&fit=crop",
    treatment: "Allergy Treatment & Nutrition Plan",
    rating: 5
  },
  {
    id: 2,
    petName: "Whiskers",
    ownerName: "Raj Patel",
    story: "Our cat Whiskers had a complex surgery that saved her life. The care and attention from Dr. Ravi's team was exceptional throughout the recovery.",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=800&auto=format&fit=crop",
    treatment: "Emergency Surgery & Recovery",
    rating: 5
  },
  {
    id: 3,
    petName: "Rocky",
    ownerName: "Anjali Reddy",
    story: "Rocky was overweight and lethargic. With Dr. Ravi's nutrition plan and regular check-ups, he's now the energetic dog we remember!",
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800&auto=format&fit=crop",
    treatment: "Weight Management & Wellness",
    rating: 5
  }
];

const teamMembers = [
  {
    id: 1,
    name: "Dr. Ravi Kumar",
    title: "Chief Veterinarian & Clinic Director",
    specialization: "Small Animal Medicine & Surgery",
    qualifications: "BVSc & AH, MVSc (Veterinary Medicine)",
    experience: "8+ years",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop",
    bio: "Dr. Ravi is passionate about providing comprehensive veterinary care with a focus on preventive medicine and advanced surgical procedures. He believes in building strong relationships with pet families and ensuring the highest quality of care for every patient.",
    expertise: ["Internal Medicine", "Soft Tissue Surgery", "Emergency Care", "Preventive Medicine"]
  },
  {
    id: 2,
    name: "Dr. Bindu Sharma",
    title: "Associate Veterinarian",
    specialization: "Dermatology & Nutrition",
    qualifications: "BVSc & AH, PG Diploma in TenantPet Nutrition",
    experience: "5+ years",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop",
    bio: "Dr. Bindu specializes in veterinary dermatology and pet nutrition. Her gentle approach and expertise in skin conditions and dietary management have helped countless pets achieve optimal health and comfort.",
    expertise: ["Dermatology", "Allergy Management", "TenantPet Nutrition", "Wellness Exams"]
  },
  {
    id: 3,
    name: "Praveen Kumar",
    title: "Veterinary Technician & Practice Manager",
    specialization: "Patient Care & Clinical Support",
    qualifications: "Diploma in Veterinary Science, Certified Vet Tech",
    experience: "6+ years",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
    bio: "Praveen ensures smooth clinic operations while providing exceptional patient care. His expertise in handling animals and supporting veterinary procedures makes him an invaluable part of our team.",
    expertise: ["Patient Handling", "Laboratory Procedures", "Surgical Assistance", "TenantClient Relations"]
  }
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleBookAppointment = () => {
    setShowAuthModal(true);
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="bg-gray-50 text-gray-800">
      {/* Top Navigation Bar */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dr. Ravi TenantPet Portal</h1>
                <p className="text-xs text-gray-500">Caring for your furry family</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Services
              </a>
              {/* Removed TenantPet Insurance Link */}
              <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                About & Team
              </a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Contact
              </a>
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={handleLogin}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Login
                </Button>
                <Button 
                  onClick={handleBookAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  Book TenantAppointment
                </Button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#services" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Services
                </a>
                {/* Removed TenantPet Insurance Link */}
                <a 
                  href="#about" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About & Team
                </a>
                <a 
                  href="#contact" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={handleLogin}
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                  <Button 
                    onClick={handleBookAppointment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Book TenantAppointment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-cover bg-center text-white" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=1924&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-40 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">Your TenantPet's Health, Our Priority 🐾</h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-gray-200">
            Welcome to Dr. Ravi TenantPet Portal, where compassionate care meets modern veterinary medicine. We're dedicated to keeping your furry family members happy and healthy with personalized nutrition, wellness plans, and expert medical care.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleBookAppointment} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
              Book an TenantAppointment
            </Button>
            {/* Removed "Explore TenantPet Care Tips" button */}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Our Services</h2>
            <p className="mt-2 text-gray-600">Comprehensive care for every stage of your pet's life.</p>
          </div>
          <ServicesGrid /> {/* The services grid is now handled by this component */}
        </div>
      </section>

      {/* Success Stories Section */}
      <section id="success-stories" className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Success Stories 🌟
            </h2>
            <p className="mt-2 text-gray-600">Real stories from our happy pet families</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {successStories.map((story) => (
              <Card key={story.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-lg">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={story.image} 
                    alt={story.petName}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{story.petName}</h3>
                    <div className="flex items-center">
                      {[...Array(story.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mb-2">{story.treatment}</p>
                  <p className="text-gray-600 text-sm mb-4">{story.story}</p>
                  <p className="text-xs text-gray-500">- {story.ownerName}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Combined About & Team Section */}
      <section id="about" className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-6">
          {/* About Section */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-16">
            <div className="md:w-1/2">
               <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2069&auto=format&fit=crop" alt="Happy pets" className="rounded-2xl shadow-xl w-full h-auto" />
            </div>
            <div className="md:w-1/2 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-4">Meet Dr. Ravi & The Team</h2>
              <p className="text-lg text-gray-700 mb-6">
                Dr. Ravi leads our team of dedicated veterinary professionals who are all passionate pet lovers. We believe in building lasting relationships with our clients and their pets, providing personalized care tailored to each animal's unique needs. Our clinic is a place of healing, comfort, and expertise.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600">Happy Pets</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">5+</div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-600">Emergency Care</div>
                </div>
              </div>
            </div>
          </div>

          {/* Expert Team Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Expert Team 👨‍⚕️👩‍⚕️</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our dedicated team of veterinary professionals combines years of experience with genuine compassion 
              for animals. We're committed to providing the highest standard of care for your beloved pets.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 overflow-hidden">
                <div className="relative">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-blue-600 font-semibold text-sm mb-1">{member.title}</p>
                    <p className="text-xs text-gray-600 mb-2">{member.specialization}</p>
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {member.experience}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Qualifications:</h4>
                      <p className="text-xs text-gray-600">{member.qualifications}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Expertise:</h4>
                      <div className="flex flex-wrap gap-1">
                        {member.expertise.slice(0, 3).map((skill, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 leading-relaxed mt-2">{member.bio.substring(0, 100)}...</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Team Values */}
          <div className="mt-12 bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Commitment to Excellence</h3>
              <p className="text-gray-600 text-sm">What sets our team apart in veterinary care</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-sm mb-2">Compassionate Care</h4>
                <p className="text-xs text-gray-600">We treat every pet as if they were our own, with love and understanding</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-sm mb-2">Advanced Medicine</h4>
                <p className="text-xs text-gray-600">Utilizing the latest technology and techniques for optimal outcomes</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-sm mb-2">Family Approach</h4>
                <p className="text-xs text-gray-600">Building lasting relationships with both pets and their human families</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TenantPet Gallery Section */}
      <section className="py-16 bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Happy Pets, Happy Families 📸
            </h2>
            <p className="mt-2 text-gray-600">See some of our beloved patients living their best lives!</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative group overflow-hidden rounded-2xl shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=500&auto=format&fit=crop" 
                alt="Happy dog" 
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <p className="text-white p-4 font-semibold">Buddy 🐕</p>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-2xl shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=500&auto=format&fit=crop" 
                alt="Cute cat" 
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <p className="text-white p-4 font-semibold">Whiskers 🐱</p>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-2xl shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1425082661705-1834bfd09dca?q=80&w=500&auto=format&fit=crop" 
                alt="Colorful bird" 
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <p className="text-white p-4 font-semibold">Rainbow 🐦</p>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-2xl shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=80&w=500&auto=format&fit=crop" 
                alt="Cute rabbit" 
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <p className="text-white p-4 font-semibold">Fluffy 🐰</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Visit Us</h2>
            <p className="mt-2 text-gray-600">We're here for you and your pet.</p>
          </div>
          <Card className="overflow-hidden shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 md:p-12 bg-blue-600 text-white">
                <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                <div className="space-y-4 text-lg">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 mt-1 flex-shrink-0" />
                    <span>No. 32, 4th temple Street road, 15th Cross Rd, Malleshwaram, Bengaluru, Karnataka 560003</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="w-6 h-6" />
                    <div>
                      <a href="tel:08296143115" className="hover:underline block">Call: 082961 43115</a>
                      <a 
                        href="https://wa.me/918296143115" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline text-green-200 flex items-center gap-2 mt-1"
                      >
                        <MessageCircle className="w-5 h-5" />
                        WhatsApp: +91 82961 43115
                      </a>
                    </div>
                  </div>
                   <div className="flex items-center gap-4">
                    <Clock className="w-6 h-6" />
                    <span>Open daily: 9:00 AM - 9:00 PM</span>
                  </div>
                </div>
                
                {/* WhatsApp Quick Action */}
                <div className="mt-8 p-4 bg-green-500 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Quick WhatsApp Contact
                  </h4>
                  <p className="text-sm text-green-100 mb-3">Get instant responses for emergencies or quick questions</p>
                  <a 
                    href="https://wa.me/918296143115?text=Hello%20Dr.%20Ravi%20Pet%20Portal,%20I%20need%20help%20with%20my%20pet" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-white text-green-600 hover:bg-green-50 w-full">
                      Chat on WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
              <div className="h-64 lg:h-auto">
                 <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.411681928014!2d77.5701838152787!3d13.00947771740921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae161b93195a9d%3A0x63351950e33de146!2s4th%20Main%20Rd%2C%20Malleshwaram%2C%20Bengaluru%2C%20Karnataka%20560003!5e0!3m2!1sen!2sin!4v1678886400000" 
                    width="100%" 
                    height="100%" 
                    style={{border:0}} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade">
                </iframe>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-400">
           <p>© {new Date().getFullYear()} Dr. Ravi TenantPet Portal. All Rights Reserved.</p>
           <p className="text-sm mt-2">Caring for the pets of Malleshwaram, Bengaluru with love and expertise.</p>
        </div>
      </footer>

      {/* Virtual Chat Widget */}
      <VirtualChat />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
