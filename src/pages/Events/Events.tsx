import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Event } from '@/model/Event';
import { User } from '@/model/User';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast, useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { endOfDay } from 'date-fns';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const Events: React.FC = () => {
  const currentUser: User | null = JSON.parse(localStorage.getItem("user") || "");
  const initialEventForm = {
    title: '',
    description: '',
    receivers: '',
    type: currentUser?.role === 'employee' ? 'Private' : 'Public',
    start: "",
    end: "",
  }
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedReceivers, setSelectedReceivers] = useState<Array<User>>([])
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [slotDate, setSlotDate] = useState(new Date())
  const [formData, setFormData] = useState<Omit<Event, 'id'>>(initialEventForm);
  const [suggestions, setSuggestions] = useState<Array<User>>([]);
  const { toast } = useToast();

  const handleReceiversChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'receivers' && value) {
      try {
        const response = await axios.get(`http://localhost:3030/api/v1/users?name=${value}`,{
          headers:{ Authorization: `Bearer ${localStorage.getItem("token")}` },
          withCredentials: true
      })
        const users = response.data.users
        setSuggestions(users ?? []);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to fetch email suggestions",
          variant: "destructive",
        });
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (receiver: User) => {
    if (!selectedReceivers.some(selected => selected._id === receiver._id)) {
      setSelectedReceivers(prev => [...prev, receiver]);
    }
    setFormData(prev => ({ ...prev, receivers: '' }))
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = suggestions.find(user => user._id === formData.receivers);
      if (match) {
        handleSelectSuggestion(match);
      }
    }
  };

  const handleRemoveEmail = (user: User) => {
    setSelectedReceivers(prev => prev.filter(e => e._id !== user._id));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3030/api/v1/events',{
        headers:{ Authorization: `Bearer ${localStorage.getItem("token")}` },
        withCredentials: true
    })
      const formattedEvents = response.data.events.map((event: Event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedEvents);
    } catch (error) {
        console.error(error)
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setIsEditing(false);
    setSlotDate(start)
    setFormData({
      ...initialEventForm,
      start,
      end,
    });
    setSelectedReceivers([])
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setSlotDate(event.start)
    setFormData({
      title: event.title,
      description: event.description,
      receivers: "",
      type: event.type,
      start: event.start,
      end: event.end,
    });
    setSelectedReceivers(event.receivers)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: 'start' | 'end', date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, [name]: date }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const now = new Date();

    if (formData.start < now) {
        alert("Event cannot be in the past");
        toast({
            title: "Error",
            description: "Start date cannot be in the past.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    if (formData.end <= formData.start) {
        alert("End date must be after the start date");
        toast({
            title: "Error",
            description: "End date must be after the start date.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    const eventData = {
        ...formData,
        eventType: formData.type,
        receivers: selectedReceivers.map(receiver => receiver._id),
    };
    try {
        if (isEditing && selectedEvent) {
            await axios.patch(`http://localhost:3030/api/v1/events/${selectedEvent._id}`, eventData, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                withCredentials: true,
            });
            toast({
                title: "Success",
                description: "Event updated successfully",
            });
        } else {
            await axios.post('http://localhost:3030/api/v1/events', eventData, { // Use eventData instead of formData
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                withCredentials: true,
            });
            toast({
                title: "Success",
                description: "Event added successfully",
            });
        }
        fetchEvents();
        setIsEditing(false);
        setSelectedEvent(null);
        setFormData(initialEventForm);
        setSelectedReceivers([])
        alert("Event added successfully")
        scrollTo(0, 0);
    } catch (error) {
        console.error(error);
        alert("Failed to add event, please make sure all fields are filled out correctly.")
        toast({
            title: "Error",
            description: `Failed to ${isEditing ? 'update' : 'add'} event`,
            variant: "destructive",
        });
    }
    setIsLoading(false);
  };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            setIsLoading(true);
            try {
                await axios.delete(`http://localhost:3030/api/v1/events/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    withCredentials: true
                });
                toast({
                    title: "Success",
                    description: "Event deleted successfully",
                });
                setFormData(initialEventForm);
                fetchEvents();
                setSelectedEvent(null);
                setIsEditing(false);
            } catch (error) {
                console.error(error);
                const errorMessage = error.response?.data?.message || "Failed to delete event";
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        }
    };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Event Management</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
            />
          </CardContent>
        </Card>
        <Card className={new Date() > slotDate ? `opacity-50 pointer-events-none` : ""}>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Event' : 'Add Event'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="receivers">Receivers (email)</Label>
                <Input
                  id="receivers"
                  name="receivers"
                  value={formData.receivers}
                  onChange={handleReceiversChange}
                  onKeyDown={handleKeyDown}
                />
                {suggestions.length > 0 && (
                  <div className='border border-[#d0d0d0]'>
                    {isLoading && <div>Loading...</div>}
                    {suggestions.length > 0 && (
                      <ul className="flex gap-[1px] flex-wrap">
                        {suggestions.map((user, index) => (
                          <li className='w-full px-[5px] cursor-pointer hover:border hover:shadow border-[#d0d0d0]' key={index} onClick={() => handleSelectSuggestion(user)}>
                            {user.email}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {selectedReceivers.length > 0 && (
                  <ul className="mt-2">
                    {selectedReceivers.map((user, index) => (
                      <li key={index}
                        onClick={() => handleRemoveEmail(user)}
                        className="py-1 px-2 bg-gray-100 flex items-center justify-between cursor-pointer rounded-md my-1">
                        <p>{user.email}</p>
                        <div>×</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label htmlFor="type">Event Type</Label>
                <Select name="type" value={formData.type} onValueChange={(value) => handleInputChange({ target: { name: 'type', value } } as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {
                      currentUser?.role !== "employee" &&
                      <>
                        <SelectItem value="Public">Public</SelectItem>
                        <SelectItem value="Holiday">Holiday</SelectItem>
                      </>
                    }
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start">Start Date & Time</Label>
                <Input
                  id="start"
                  name="start"
                  type="datetime-local"
                  value={moment(formData.start).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) => handleDateChange('start', new Date(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end">End Date & Time</Label>
                <Input
                  id="end"
                  name="end"
                  type="datetime-local"
                  value={moment(formData.end).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) => handleDateChange('end', new Date(e.target.value))}
                  required
                />
              </div>
              <div className="flex justify-between gap-[10px] items-center">
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isEditing ? 'Update Event' : 'Add Event'}
                </Button>
                {isEditing && (
                  <Button className="w-full" type="button" variant="destructive" onClick={() => handleDelete(selectedEvent!._id)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Event
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Events;