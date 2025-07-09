import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Fingerprint, PawPrint, Heart, Phone, Search, Shield, Microscope, FileText, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const features = [
  {
    icon: Fingerprint,
    title: "Breed Identification",
    description: "Discover your dog's exact breed composition with 99.9% accuracy using advanced genetic analysis.",
  },
  {
    icon: Shield,
    title: "Health Screening",
    description: "Screen for 200+ genetic health conditions to help prevent and manage potential health issues early.",
  },
  {
    icon: Search,
    title: "Trait Analysis",
    description: "Understand your pet's physical traits, behavioral tendencies, and genetic predispositions.",
  },
];

const healthConditions = [
  { category: "Eye Conditions", tests: "Progressive Retinal Atrophy, Cataracts, Glaucoma" },
  { category: "Heart Conditions", tests: "Dilated Cardiomyopathy, Arrhythmogenic Right Ventricular Cardiomyopathy" },
  { category: "Neurological", tests: "Degenerative Myelopathy, Epilepsy, Cerebellar Ataxia" },
  { category: "Blood Disorders", tests: "Von Willebrand Disease, Hemophilia, Factor VII Deficiency" },
  { category: "Metabolic", tests: "Glycogen Storage Disease, Hyperuricosuria, Cystinuria" },
  { category: "Skeletal", tests: "Hip Dysplasia Risk, Elbow Dysplasia, Osteochondrodysplasia" },
];

const process = [
  { step: "1", title: "Order Kit", description: "Purchase the DNA test kit from Dr. Ravi's clinic or online" },
  { step: "2", title: "Collect Sample", description: "Simple cheek swab collection at home - painless and stress-free" },
  { step: "3", title: "Send to Lab", description: "Mail the sample using the prepaid shipping label provided" },
  { step: "4", title: "Get Results", description: "Receive comprehensive results in 2-3 weeks via email and app" },
];

const benefits = [
  "Early detection of genetic health risks",
  "Personalized nutrition and exercise recommendations",
  "Better understanding of behavioral traits",
  "Informed breeding decisions",
  "Tailored preventive care plans",
  "Peace of mind about your pet's health"
];

const faqs = [
  {
    question: "How accurate is the DNA test?",
    answer: "Our DNA test provides 99.9% accuracy for breed identification and uses the latest genetic science for health screening. The test analyzes over 200,000 genetic markers."
  },
  {
    question: "Is the sample collection painful for my dog?",
    answer: "Not at all! The test uses a simple cheek swab that takes just 30 seconds. Most dogs don't even notice it happening, and no needles or blood are required."
  },
  {
    question: "How long does it take to get results?",
    answer: "Results are typically available within 2-3 weeks after the lab receives your sample. You'll be notified via email when results are ready."
  },
  {
    question: "What breeds can be detected?",
    answer: "The test can identify over 350 dog breeds, including mixed breeds, rare breeds, and even wolf content. It provides percentage breakdowns for mixed breed dogs."
  },
  {
    question: "Can this help with my dog's diet and exercise?",
    answer: "Yes! Based on your dog's genetic makeup, we provide personalized recommendations for nutrition, exercise needs, and care specific to their breed composition."
  }
];

export default function DNATracePage() {
  return (
    <div className="bg-gray-50 text-gray-800">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dr. Ravi Pet Portal</h1>
                <p className="text-xs text-gray-500">DNA Trace</p>
              </div>
            </Link>
            <a href="tel:08296143115">
                <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg">
                    <Phone className="w-4 h-4 mr-2" />
                    Call to Enquire
                </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold text-purple-900 tracking-tight">Unlock Your Dog's Genetic Secrets 🧬</h1>
                <p className="mt-4 max-w-2xl text-lg text-gray-600">
                    Discover your dog's breed composition, health risks, and genetic traits with our comprehensive DNA analysis. Get personalized insights for better care.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                    <a href="tel:08296143115">
                        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg w-full sm:w-auto">
                            <Phone className="w-5 h-5 mr-2" /> Order DNA Kit
                        </Button>
                    </a>
                    <a href="#process">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto">
                           How It Works
                        </Button>
                    </a>
                </div>
                <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>99.9% Accurate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span>Results in 2-3 weeks</span>
                    </div>
                </div>
            </div>
            <div className="md:w-1/2">
                <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1200&auto=format&fit=crop" alt="Happy dog with DNA helix background" className="rounded-2xl shadow-xl w-full h-auto" />
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Why Choose DNA Testing for Your Dog?</h2>
            <p className="mt-2 text-gray-600">Comprehensive genetic analysis for better pet care decisions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Health Screening Section */}
      <section className="py-16 md:py-24 bg-purple-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-purple-900">Comprehensive Health Screening</h2>
            <p className="mt-2 text-gray-600">Screen for 200+ genetic health conditions across major categories.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {healthConditions.map((condition) => (
              <div key={condition.category} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <Microscope className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-lg text-gray-900">{condition.category}</h3>
                </div>
                <p className="text-sm text-gray-600">{condition.tests}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works - Simple & Easy</h2>
            <p className="mt-2 text-gray-600">Get your dog's genetic insights in just 4 simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {process.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Benefits of DNA Testing</h2>
            <p className="mt-2 text-gray-600">Empower yourself with genetic knowledge for better pet care.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-lg font-semibold text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Discover Your Dog's Story?</h2>
          <p className="text-xl mb-8 text-purple-100">Order your DNA test kit today and unlock valuable insights about your furry friend.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="tel:08296143115">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg">
                <Phone className="w-5 h-5 mr-2" />
                Call to Order - ₹4,999
              </Button>
            </a>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
              <FileText className="w-5 h-5 mr-2" />
              Download Brochure
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-400">
           <p>© {new Date().getFullYear()} Dr. Ravi Pet Portal. All Rights Reserved.</p>
           <p className="text-sm mt-2">Advanced genetic testing for better pet health in Malleshwaram, Bengaluru.</p>
        </div>
      </footer>
    </div>
  );
}