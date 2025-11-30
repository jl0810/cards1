import { Button, Heading, Text, Section } from '@react-email/components';
import { EmailLayout } from '../components/Layout';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout previewText={`Welcome to our platform, ${userName}!`}>
      <Heading style={heading}>
        Welcome to Your SaaS App, {userName}! 🎉
      </Heading>

      <Text style={paragraph}>
        Thank you for joining our platform! We&apos;re excited to have you on board.
      </Text>

      <Text style={paragraph}>
        Your account has been successfully created and you can now access all the features of our platform.
      </Text>

      <Section style={buttonContainer}>
        <Button href={loginUrl} style={button}>
          Get Started
        </Button>
      </Section>

      <Text style={paragraph}>
        If you have any questions, feel free to reach out to our support team.
      </Text>

      <Text style={paragraph}>
        Best regards,<br />
        The Your SaaS App Team
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  color: '#4b5563',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '600',
  display: 'inline-block',
};
