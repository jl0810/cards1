import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type = 'info', priority = 'medium', targetUserId, actionUrl, actionText } = await request.json();

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // In a real app, you'd check if the user is an admin
    // For demo purposes, we'll allow any authenticated user

    // Create the notification trigger
    const result = await novu.trigger('admin-alert', {
      to: targetUserId ? { subscriberId: targetUserId } : 'all-subscribers',
      payload: {
        title,
        message,
        type,
        priority,
        actionUrl,
        actionText,
        sentBy: userId,
        sentAt: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: result.data?.notificationId,
      message: 'Alert sent successfully'
    });

  } catch (error) {
    console.error('Error sending admin alert:', error);
    return NextResponse.json({ 
      error: 'Failed to send alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent alerts (for admin dashboard)
    // This is a placeholder - you'd implement actual alert history
    return NextResponse.json({
      alerts: [],
      message: 'Alert history feature coming soon'
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
