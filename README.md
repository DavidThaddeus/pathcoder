# PathCoder - AI-Powered Coding Challenges

PathCoder is a SAAS platform that generates personalized coding projects, tasks, and quizzes based on your learning journey. Unlike generic coding challenge platforms, PathCoder creates content that directly reinforces the specific topics and technologies you've been studying.

## 🌟 Key Features

- **AI-Powered Personalization**: Generate challenges based on your specific learning path
- **Multi-Language Support**: Covers frontend, backend, and full-stack technologies
- **Progressive Difficulty**: Adapts from beginner to expert levels
- **Solution Access**: Learn from complete, well-documented solutions
- **Real-World Focus**: Projects simulate actual development scenarios
- **Learning Analytics**: Track progress and identify knowledge gaps

## 🎯 What Makes PathCoder Stand Out

- **Contextual Learning**: Projects are generated based on your specific learning journey
- **Solution-First Approach**: Access to complete solutions helps users learn best practices
- **Adaptive Intelligence**: AI understands your progress and creates appropriate challenges
- **Holistic Skill Building**: Combines project-based learning with theoretical reinforcement

## 💰 Monetization Strategy

### Freemium Model
- **Free Tier**: 3 projects per month, basic quizzes, community solutions
- **Pro ($9.99/month)**: Unlimited projects, instant solution access, advanced difficulty levels
- **Premium ($19.99/month)**: Custom learning paths, team features, progress analytics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Groq API key (for testing) or OpenAI API key (for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pathcoder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Custom design system
- **UI Components**: Radix UI, Lucide React icons
- **AI Integration**: Groq SDK (testing), OpenAI (production)
- **Authentication**: NextAuth.js, Supabase
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (recommended)

## 📱 Design Philosophy

PathCoder features a mobile-first design that looks great on all devices:
- **Mobile**: Clean, app-like interface optimized for touch
- **Desktop**: Professional layout with enhanced functionality
- **Theme**: White, black, and warm beige (#DCC5B2) color scheme

## 🎨 Key Components

### Landing Page
- Compelling hero section with clear value proposition
- Feature showcase highlighting unique selling points
- Transparent pricing with freemium model
- Professional design that converts visitors to users

### Dashboard
- Intuitive project generation interface
- Topic selection based on learning progress
- Skill level and challenge type customization
- Progress tracking and analytics

### AI Integration
- Personalized project generation using Groq/OpenAI
- Context-aware challenges based on user's learning path
- Progressive difficulty scaling
- Real-world project scenarios

## 🔧 API Endpoints

### `/api/generate-project`
Generates personalized coding challenges based on:
- Topics learned
- Skill level (beginner/intermediate/advanced)
- Project type (project/task/quiz)
- Tech stack preferences
- Time constraints

## 🎯 Target Audience

- Self-taught developers seeking structured practice
- Bootcamp graduates wanting to reinforce learning
- Computer science students needing practical application
- Career changers learning programming
- Developers expanding to new languages/frameworks

## 🏆 Competitive Advantage

PathCoder fills the gap between structured courses and generic challenges by providing **personalized, progressive project generation** that adapts to individual learning journeys.

### vs. Competitors
- **LeetCode/HackerRank**: Generic algorithmic challenges vs. personalized projects
- **FreeCodeCamp**: Fixed curriculum vs. adaptive content
- **Exercism**: Language-specific vs. cross-technology integration
- **Codecademy**: Course-based vs. project-based practice

## 📈 Future Roadmap

- [ ] Payment integration (Stripe)
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Integration with popular learning platforms
- [ ] Community features and peer learning
- [ ] Certification and skill verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@pathcoder.dev or join our Discord community.

---

**PathCoder** - Where personalized learning meets real-world coding practice. 🚀
